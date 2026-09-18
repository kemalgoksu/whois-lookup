# Contributing

Thanks for helping improve WHOIS Lookup.

## Workflow

1. Fork the repository and create a focused branch.
2. Make your change in the shared source files whenever possible.
3. Run `node scripts/build.mjs`, then test `build/firefox/` in Firefox and `build/chrome/` in Chrome.
4. Update the README or privacy disclosure if behavior, permissions, or network services change.
5. Open a pull request explaining the problem, the solution, and how you tested it.

Please keep pull requests small and avoid committing packaged `.xpi`/`.zip` files, editor settings, or temporary output.
