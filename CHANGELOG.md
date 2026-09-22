# Changelog

## 0.3.1

- Hover explains the standard library and your own packages: `math.sqrt` shows
  its signature and docstring, `math.PI` its type, `containers.stack` its
  docstring and constructor, and hovering `math` names the package. A method
  called on a variable made by a package's family, such as `pile.push(...)`
  after `pile = containers.stack();`, is found too. Needs marslang rs-0.11.1.

## 0.3.0

- **Hover.** Functions, families, and methods show their signature and
  docstring; variables show their type, and whether it was written or taken
  from the first value; parameters, loop items, and caught errors say what they
  are. Built-ins, `std.Error` families, and `std.Decorator` markers are
  described too. Unsaved edits are included, and while the text does not parse
  the last good result is kept. Needs marslang rs-0.11.0 or later for your own
  declarations; built-ins work with any version.
- Triple-quoted strings (`"""..."""`) are highlighted across lines, including
  docstrings in `@Decorator.docstring(...)`.
- `Error.TypeError` and the other `std.Error` families are highlighted as error
  families.

## 0.2.0

- Licensed under the Marslang Source License 1.0: source-available, free for
  noncommercial use, with changes allowed for contributions. See LICENSE.md.
- Marketplace listing: the Marslang planet icon, a gallery banner, and a link
  for reporting issues.
- Diagnostics land on the reported line with rs-0.9.1 and later.

## 0.1.0

First release.

- `.mars` and `.mrs` files are recognised as Marslang, with a TextMate grammar
  covering keywords, bindings, type annotations, families, decorators, imports,
  error families, strings, numbers, and comments.
- `marslang check` runs when a file is opened and saved, and its error is shown
  on the line it belongs to. An error the interpreter cannot place is shown on
  the name it quotes.
- Snippets for the entry point, functions, families, private methods, error
  handling, loops, and imports.
- **Marslang: Run File** runs the open file in a terminal.
