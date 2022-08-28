# PeerTube plugin Quickstart Typescript

This is a fork of [peertube-plugin-quickstart](https://framagit.org/framasoft/peertube/peertube-plugin-quickstart)
(See [the Peertube documentation](https://docs.joinpeertube.org/#/contribute-plugins?id=write-a-plugintheme)).

Differences are:

* both backend and frontend code are in Typescript
* backend code is in a subdirectory, so it can easily be separated in multiple module files
* classic CSS are replaced by [SCSS](https://fr.wikipedia.org/wiki/Sass_(langage))
* there are linting rules to ensure code quality

## Compilation

To compile your plugin, first install dependencies with `npm install` (you only
have to do this the first time), then just run: `npm run build`.

For more information, you can refer to the documentation for the
[official quickstart plugin](https://docs.joinpeertube.org/#/contribute-plugins?id=write-a-plugintheme).

You can run `npm run clean` to empty the `dist` folder (where goes all compiled code).

You can only rebuild part of the plugin by running one of the script defined in
`package.json`. For example, to only rebuild backend code: `npm run build:server`.

To install the plugin to your test server, you have to use the
[Peertube CLI](https://docs.joinpeertube.org/contribute-plugins?id=test-your-plugintheme).

Note: when installing multiple times the plugin, be aware that the `~/.cache/yarn`
folder of your test server will grow... a lot. It can really fast grow to dozens
of GB. And millions of files, filling the inode table of your disk.
You can safely delete this folder.

## Peertube version

Peertube types definitions comme from the official package `@types/peertube-types`.
To avoid problems, use same versions for `@types/peertube-types` as the supported
peertube engine in your `package.json`.
So, for example, if you plan to support Peertube v4.2.0 and above, use v4.2.0 for
`@types/peertube-types` and `engine.peertube`.

Note: the first stable version of `@types-peertube-types` is v4.2.0, that is why
this quickstart plugin requires Peertube v4.2.0, althought it could work with
older versions.

## Linting

To check linting, just run `npm run test`.

This package comes with a `.vscode` folder that contains settings for
Visual Studio Code. These settings ensure your Visual Studio Code uses linting
rules. If you don't want this, you can add `.vscode` to the `.gitignore` file.

Check the `.eslintrc.json` for special linting rules that I recommand
(for example `"@typescript-eslint/no-unused-vars": [2, {"argsIgnorePattern": "^_"}]`
that allow you to prefix unused arguments with `_`).

Note: there is linting for both Typescript and SCSS files.

## ESBuild vs Typescript

The official `peertube-plugin-quickstart` uses ESbuild for frontend code generation.
ESBuild can handle Typescript, but does not check types 
(see [ESBuild documentation](https://esbuild.github.io/content-types/#typescript)).
That's why we first comple typescript with the `-noEmit` option, just to check types.
Then, if everything is okay, we run ESBuild to generate the compiled javascript.

## Typescript version

To be sure to use the right version of Typescript, Typescript is a dev dependency
of this plugin. That's why we use `npx tsc` to compile typescript: it ensure
your are using the version that is indicated in the `package.json` file.
