# Nightsky ATProto Support Code

This part of the codebase is an attempt to more closely reflect the lexicons. Doing this also makes a path for
generating code from the lexicon definitions in the future.

It probably shouldn't be used in code beyond this project, until further work can be done to separate it out.

## Notes

- You only need to have `import AT from "@/index.ts";` to make the magic happen. Importing internal bits isn't the best
  way to, as it reduces clarity of where you're pulling from.

- `#` used to denote defs doesn't work in TypeScript, so `.$` is used instead.
