---
title: Duan smearing estimator when your target is log-transformed
date: 2026-05-21
tags: [machine-learning, statistics, python]
description: A small correction for turning log-scale regression predictions back into prices.
---

I use log targets a lot in regression problems.

Prices, revenue, rents, salaries: they usually have a long right tail. Modeling
`log(y)` instead of `y` often makes the problem calmer.

But there is a small trap:

```python
pred_price = np.exp(pred_log_price)
```

That line is simple, common, and usually biased low.

The fix is also simple. It is called **Duan's smearing estimator**.

## The setup

I used [an old OLX apartment](https://www.kaggle.com/datasets/sampaiovitor/belo-horizonte-apartment-real-estate) listing dataset I collected from Belo Horizonte. The
point here is not to build a serious real estate model. The point is only to show
the correction with something concrete.

The target is listing price in BRL.

![Histogram of apartment listing prices showing a right-skewed distribution.](/images/duan-smearing/price-skew.png)

The raw prices are skewed. After logging the target, the distribution is easier
for a plain regression model to deal with.

![Histogram of log apartment listing prices.](/images/duan-smearing/log-price.png)

I fit a boring model on purpose:

- features: area, rooms, bathrooms, parking spots, condo fee, tax, region
- model: `Ridge` regression
- target: `log(price)`

Something like:

```python
model.fit(X_train, np.log(y_train))
pred_log_price = model.predict(X_test)
```

Now we need to come back from log-price to price.

## The wrong-but-common back transform

The naive version is:

```python
pred_price_naive = np.exp(pred_log_price)
```

This feels right, because log and exp are inverse functions.

The catch: the model is estimating the expected value on the log scale, not the
expected value on the original price scale.

In general:

```text
exp(E[log(y)]) is not the same thing as E[y]
```

For right-skewed targets, `exp(pred_log_price)` is closer to a conditional
median. If what you want is an expected price, it tends to undershoot.

## Duan's smearing estimator

After fitting the model, compute residuals on the log scale using the training
set:

```python
train_log_pred = model.predict(X_train)
residuals = np.log(y_train) - train_log_pred
```

Then compute the average exponentiated residual:

```python
smearing_factor = np.exp(residuals).mean()
```

Finally, multiply the naive prediction by this factor:

```python
pred_price_smeared = np.exp(pred_log_price) * smearing_factor
```

That is the whole trick.

In this run, the smearing factor was:

```text
1.0522
```

So the correction increased the back-transformed predictions by about 5.2%.

## Why it works

Think of the log model as:

```text
log(y) = prediction + error
```

Then:

```text
y = exp(prediction + error)
y = exp(prediction) * exp(error)
```

The naive version keeps `exp(prediction)` and silently acts like the error part
averages to 1.

Duan's estimator says: do not assume that. Estimate it from the residuals:

```text
average(exp(error))
```

That average is the smearing factor.

![Distribution of residuals from the log-price model.](/images/duan-smearing/log-residuals.png)

## Tiny result

On the holdout set from this toy model:

| Method | Mean predicted price | Actual mean price | Mean bias | MAPE |
| --- | ---: | ---: | ---: | ---: |
| Naive `exp(pred)` | R$ 605,080 | R$ 631,428 | -R$ 26,348 | 25.63% |
| Duan smeared | R$ 636,649 | R$ 631,428 | R$ 5,221 | 27.35% |

![Bar chart comparing actual mean price, naive mean prediction, and Duan smeared mean prediction.](/images/duan-smearing/prediction-means.png)

Notice something important: smearing fixed the average scale, but it did not
magically improve every metric. The MAPE got slightly worse here.

That is not a contradiction. Duan's smearing estimator is about correcting the
back-transformation when you want predictions on the original mean scale. It is
not a free accuracy cheat code.

## One listing

For one holdout apartment:

```text
area:    92 m²
rooms:   3
baths:   3
parking: 2
region:  zona_centro_sul

actual:  R$ 1,365,000
naive:   R$   973,053
smeared: R$ 1,023,821
```

Still wrong, because the model is intentionally simple. But the corrected version
moves in the direction implied by the log-scale residuals.

## The rule of thumb

If you train a regression model on `log(y)` and need predictions back in the
original unit, do not stop at:

```python
np.exp(pred)
```

At least try:

```python
smearing_factor = np.exp(log_residuals_train).mean()
pred_y = np.exp(pred_log_y) * smearing_factor
```

It is one line, model-agnostic, and usually the first correction I want before
interpreting log-target predictions as money again.

