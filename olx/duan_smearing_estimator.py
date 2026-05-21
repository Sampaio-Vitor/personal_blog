# %% [markdown]
# # Duan's smearing estimator with apartment listing prices
#
# A tiny, runnable notebook-style script for the blog post.
#
# The goal is intentionally modest: fit a plain regression model on `log(price)`,
# show why `exp(predicted_log_price)` is biased low, and correct it with Duan's
# smearing estimator.
#
# Run from the repository root:
#
# ```bash
# olx/.venv/bin/python olx/duan_smearing_estimator.py
# ```

# %%
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# %%
ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "olx" / "final_dataframe.csv.zip"
OUT_DIR = ROOT / "public" / "images" / "duan-smearing"
OUT_DIR.mkdir(parents=True, exist_ok=True)

sns.set_theme(style="whitegrid")
plt.rcParams.update(
    {
        "figure.dpi": 140,
        "savefig.bbox": "tight",
        "axes.edgecolor": "#1a1a1a",
        "axes.labelcolor": "#1a1a1a",
        "text.color": "#1a1a1a",
        "xtick.color": "#1a1a1a",
        "ytick.color": "#1a1a1a",
        "font.family": "monospace",
    }
)

# %% [markdown]
# ## 1. Load and lightly clean the OLX dataframe
#
# The raw scrape has strings like `R$ 350`, `67m²`, and occasional non-numeric
# values in count columns. We only need a few features for the example.

# %%
raw = pd.read_csv(DATA_PATH)
raw.shape, raw.head(3)

# %%
def money_to_float(series: pd.Series) -> pd.Series:
    """Convert Brazilian money-looking strings into floats."""
    cleaned = (
        series.astype("string")
        .str.replace("R$", "", regex=False)
        .str.replace(".", "", regex=False)
        .str.replace(",", ".", regex=False)
        .str.extract(r"([-+]?\d*\.?\d+)")[0]
    )
    return pd.to_numeric(cleaned, errors="coerce")


def number_from_text(series: pd.Series) -> pd.Series:
    """Extract the first number; map '5 ou mais' to 5."""
    s = series.astype("string").str.lower().str.replace("5 ou mais", "5", regex=False)
    return pd.to_numeric(s.str.extract(r"(\d+)")[0], errors="coerce")


df = raw.assign(
    price=pd.to_numeric(raw["PRICE"], errors="coerce"),
    area_m2=number_from_text(raw["AREA"]),
    condo=money_to_float(raw["CONDO"]),
    tax=money_to_float(raw["TAX"]),
    rooms=number_from_text(raw["ROOMS_NO"]),
    baths=number_from_text(raw["BATH_NO"]),
    parking=number_from_text(raw["PARKING_SPOTS"]),
    region=raw["REGION"].astype("string"),
)

# Keep the example boring: sales prices in a plausible range, with area present.
df = df.query("50_000 <= price <= 5_000_000 and 15 <= area_m2 <= 500").copy()
df["log_price"] = np.log(df["price"])

features = ["area_m2", "rooms", "baths", "parking", "condo", "tax", "region"]
df[features + ["price", "log_price"]].describe(include="all")

# %% [markdown]
# ## 2. Fit a plain model on `log(price)`
#
# A log target is useful because apartment prices are heavily right-skewed. The
# log scale makes the regression problem smoother. But it changes the meaning of
# the prediction.

# %%
X = df[features]
y_log = df["log_price"]
y_price = df["price"]

X_train, X_test, y_log_train, y_log_test, y_price_train, y_price_test = train_test_split(
    X, y_log, y_price, test_size=0.25, random_state=42
)

numeric_features = ["area_m2", "rooms", "baths", "parking", "condo", "tax"]
categorical_features = ["region"]

preprocess = ColumnTransformer(
    transformers=[
        (
            "num",
            Pipeline(
                steps=[
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                ]
            ),
            numeric_features,
        ),
        (
            "cat",
            Pipeline(
                steps=[
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore")),
                ]
            ),
            categorical_features,
        ),
    ]
)

model = Pipeline(
    steps=[
        ("preprocess", preprocess),
        ("regressor", Ridge(alpha=1.0)),
    ]
)

model.fit(X_train, y_log_train)
train_log_pred = model.predict(X_train)
test_log_pred = model.predict(X_test)

# %% [markdown]
# ## 3. The correction: Duan's smearing factor
#
# If the model predicts log price, the naive back-transform is:
#
# $$\hat{y}_{naive} = \exp(\widehat{\log y})$$
#
# But this estimates something closer to a median, not the conditional mean.
# Duan's correction multiplies by the average exponentiated residual on the
# training set:
#
# $$\hat{y}_{smear} = \exp(\widehat{\log y}) \times \frac{1}{n}\sum_i\exp(e_i)$$
#
# where `e_i = observed_log_price_i - predicted_log_price_i`.

# %%
residuals = y_log_train - train_log_pred
smearing_factor = np.exp(residuals).mean()

pred_naive = np.exp(test_log_pred)
pred_smeared = pred_naive * smearing_factor

actual_mean_price = y_price_test.mean()

metrics = pd.DataFrame(
    [
        {
            "method": "naive exp(log prediction)",
            "rmse_brl": mean_squared_error(y_price_test, pred_naive) ** 0.5,
            "mape": mean_absolute_percentage_error(y_price_test, pred_naive),
            "mean_predicted_price": pred_naive.mean(),
            "actual_mean_price": actual_mean_price,
            "mean_bias": pred_naive.mean() - actual_mean_price,
        },
        {
            "method": "Duan smeared prediction",
            "rmse_brl": mean_squared_error(y_price_test, pred_smeared) ** 0.5,
            "mape": mean_absolute_percentage_error(y_price_test, pred_smeared),
            "mean_predicted_price": pred_smeared.mean(),
            "actual_mean_price": actual_mean_price,
            "mean_bias": pred_smeared.mean() - actual_mean_price,
        },
    ]
)

print(f"Rows after cleaning: {len(df):,}")
print(f"Smearing factor: {smearing_factor:.4f}")
print(metrics.to_string(index=False, formatters={"mape": "{:.2%}".format}))

# %% [markdown]
# ## 4. Save a few blog-friendly images

# %%
fig, ax = plt.subplots(figsize=(7, 4))
sns.histplot(df["price"], bins=60, ax=ax, color="#2d5a2d")
ax.set_title("Apartment prices are right-skewed")
ax.set_xlabel("listing price (BRL)")
ax.set_ylabel("listings")
ax.ticklabel_format(style="plain", axis="x")
fig.savefig(OUT_DIR / "price-skew.png")
plt.close(fig)

fig, ax = plt.subplots(figsize=(7, 4))
sns.histplot(df["log_price"], bins=60, ax=ax, color="#2d5a2d")
ax.set_title("The log target is easier to model")
ax.set_xlabel("log(listing price)")
ax.set_ylabel("listings")
fig.savefig(OUT_DIR / "log-price.png")
plt.close(fig)

fig, ax = plt.subplots(figsize=(7, 4))
sns.histplot(residuals, bins=60, ax=ax, color="#2d5a2d")
ax.axvline(0, color="#1a1a1a", linestyle="--", linewidth=1)
ax.set_title("Residuals on the log scale")
ax.set_xlabel("observed log price - predicted log price")
ax.set_ylabel("training listings")
fig.savefig(OUT_DIR / "log-residuals.png")
plt.close(fig)

comparison = pd.DataFrame(
    {
        "Actual mean": [actual_mean_price],
        "Naive mean": [pred_naive.mean()],
        "Smeared mean": [pred_smeared.mean()],
    }
).melt(var_name="series", value_name="price")

fig, ax = plt.subplots(figsize=(7, 4))
sns.barplot(data=comparison, x="series", y="price", ax=ax, color="#2d5a2d")
ax.set_title("Smearing puts the back-transformed mean back on scale")
ax.set_xlabel("")
ax.set_ylabel("mean price on holdout set (BRL)")
ax.ticklabel_format(style="plain", axis="y")
fig.savefig(OUT_DIR / "prediction-means.png")
plt.close(fig)

# A compact CSV lets the blog post quote exact numbers without recomputing.
metrics.assign(smearing_factor=smearing_factor, rows_after_cleaning=len(df)).to_csv(
    OUT_DIR / "metrics.csv", index=False
)

# %% [markdown]
# ## 5. Tiny prediction example

# %%
example = X_test.iloc[[0]].copy()
example_actual = y_price_test.iloc[0]
example_log_pred = model.predict(example)[0]
example_naive = float(np.exp(example_log_pred))
example_smeared = float(example_naive * smearing_factor)

print("\nOne holdout listing")
print(example.to_string(index=False))
print(f"Actual:  R$ {example_actual:,.0f}")
print(f"Naive:   R$ {example_naive:,.0f}")
print(f"Smeared: R$ {example_smeared:,.0f}")
