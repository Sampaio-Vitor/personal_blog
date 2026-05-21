---
title: Pi is the best agent available
date: 2026-05-18
tags: [tools, ai, pi]
description: A quick note on why I am using Pi as my main coding agent setup.
---

Quick note on my current agent setup.

I have been using **Pi** as the thin layer around the models and tools I actually want. The main reason is simple: it is minimal, but completely personalizable.

Claude Code is very good, but it consumes a lot of memory on my machine. Codex is also good, and I like it a lot, but it still lacks a few things I care about. For example, I want to see the complete output from the agent terminal, wire in my own tools, keep my own skills, and generally shape the workflow around how I work.

Pi fits that better for me.

It starts small, then you add only what you use and want. I can connect it to different providers, install packages, add skills, add custom tools, and keep the whole thing as my own stack instead of accepting one fixed product shape.

Right now my [Pi stack](https://github.com/Sampaio-Vitor/dotfiles/) has things like:

- subagents for delegating work
- web access and code search
- Plannotator for reviewing plans and diffs visually
- session history so I can find past work
- Claude bridge when I want Claude Code involved (mostly frontend stuff)
- a few custom workflow helpers I actually use

The other part of the setup is the model provider. I am using **OpenCode Go**, which is 5 USD for the first month and then 10 USD after that. It gives access to open source models that are honestly really good.

I have been liking **GLM 5.1** a lot. **Kimi K2** and the newer Kimi models are also very strong. For a lot of coding and agent work, these models are more than enough, especially when the harness around them is good.

That is the key point for me: the model matters, but the harness matters too.

Pi gives me a minimal base, providers give me model choice, and packages let me build the exact workflow I want. Nothing fancy. But works
