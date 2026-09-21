# Marslang for Visual Studio Code

Language support for [Marslang](https://marslang.kevin-z.com): `.mars` files are
recognised as their own language, highlighted, and checked by the interpreter
itself.

## What it does

- **Syntax highlighting** for keywords, `fixed`/`hot`/`cold` bindings, type
  annotations, families and their methods, `@Decorator` markers, `takepkg`
  imports, error families, strings with escapes, and comments.
- **Diagnostics** from `marslang check`, shown where the error is. The
  interpreter reports the source line for syntax and import errors; for an error
  it cannot place, such as `unknown name 'nope'`, the extension marks where that
  name is used.
- **Snippets** for the shapes you write repeatedly: `m`, `func`, `family`,
  `private`, `run`, `for`, `takepkg`.
- **Marslang: Run File**, which runs the open file in a terminal, also on the
  editor's run button.

Checking needs the interpreter. Install it with one command from
[marslang.kevin-z.com](https://marslang.kevin-z.com), or point `marslang.path` at
a build. Without it, highlighting still works and the extension says so once.

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `marslang.path` | `""` | The interpreter to use. Empty looks for `marslang` on `PATH`, then where the installer puts it. |
| `marslang.check` | `"onSave"` | `onSave` checks a file when it is opened and saved; `off` never checks. **Marslang: Check File** always checks. |

A file is checked as it is on disk, so a diagnostic follows a save rather than
each keystroke.

## Install from source

```sh
npm install
npm test
npm run package
code --install-extension marslang-0.1.0.vsix
```

`npm test` tokenizes [test/sample.mars](test/sample.mars) with the same
TextMate engine VS Code uses and asserts the scopes themes colour, then runs the
real interpreter over broken programs and checks that each error lands on the
line it belongs to. Point `MARSLANG` at a build to use a specific interpreter.

Press `F5` in this repository to launch a VS Code window with the extension
loaded and the sample open.

## Lines in error messages

The interpreter reports positions from rs-0.9.1 onward. With rs-0.9.0 the
diagnostics still appear, but every error without a position is placed on the
name it quotes, or on the first line.

## License

No license has been chosen yet, so the usual default applies: the authors keep
all rights. A license will be added here before it matters to anyone.
