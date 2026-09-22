# Marslang for Visual Studio Code

Language support for [Marslang](https://marslang.kevin-z.com): `.mars` files are
recognised as their own language, highlighted, and checked by the interpreter
itself.

## What it does

- **Syntax highlighting** for keywords, `fixed`/`hot`/`cold` bindings, type
  annotations, families and their methods, `@Decorator` markers, `takepkg`
  imports, error families, strings with escapes, and comments.
- **Hover** over a name to see what it is: a function, family, or method shows
  its signature and its `@Decorator.docstring`; a variable shows its type, noting
  when that type comes from its first value rather than an annotation.
  Imported packages work the same way, so `math.sqrt` and `containers.stack`
  show their docstrings. Built-ins, `std.Error` families, and decorator markers
  are described too.
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
code --install-extension marslang-0.3.1.vsix
```

`npm test` tokenizes [test/sample.mars](test/sample.mars) with the same
TextMate engine VS Code uses and asserts the scopes themes colour, runs the real
interpreter over broken programs and checks that each error lands on the line it
belongs to, and checks what hovering each kind of name in the sample shows. Point
`MARSLANG` at a build to use a specific interpreter; checks that need a newer
interpreter than the one found are reported as skipped.

Press `F5` in this repository to launch a VS Code window with the extension
loaded and the sample open.

## Hover

Hover reads `marslang symbols`, added in rs-0.11.0, over the current text of the
file, unsaved edits included. Imported packages are described from rs-0.11.1.
With an older interpreter, hovering still describes built-ins, but not your own
declarations.

## Lines in error messages

The interpreter reports positions from rs-0.9.1 onward. With rs-0.9.0 the
diagnostics still appear, but every error without a position is placed on the
name it quotes, or on the first line.

## License

Marslang is **source-available** under the [Marslang Source License](LICENSE.md),
not an open source license. In short:

- Use it, and share unmodified copies free of charge, for any noncommercial purpose.
- Change it only to prepare a contribution, such as a pull request.
- Programs you write in Marslang are yours, to use and license however you like.
- Commercial use, and anything else the license does not cover, needs the
  author's written permission: open an issue to ask.
