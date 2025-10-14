# Coding Practices

This document contains general principles to follow when writing code.

## top down

Write code top-down. When implementing something, start with the main entry point, usually a function, and keep its logic single-purposed. For complicated subtasks, make helper functions for them and define those helpers below the function that calls them. This makes the code more readable because someone can read the main function, know what's going on, and then dive into an internal if they want. Every function should be short since its subtasks are implemented as helper functions.

Apply this rule within reason. If you'll need a ton of arguments passed to each helper, it might not be worth it. But that also might mean your code is fundamentally designed wrong if you need that much context at once. It might make more sense to bundle up that context.

## keep things single-purposed: modularity and decoupling

files/modules, classes, functions, etc. should be single-purposed and focused. Don't include logic for lots of different things in the same unit of code. If you need to do something that's different from the purpose of the enclosing unit of code, it's usually best to make a separate unit of code. For example, if you're implementing a website to help with splitting the bill at a restaurant and you're adding receipt scanning functionality, implement that stuff in its own module that's focused entirely on receipt scanning. That way the main application logic isn't polluted with receipt scanning logic.

This separation makes it easier to test that unit in isolation.

And since that unit is modular, with some interface, it's easy to change the implementation of that unit without affecting the rest of the code.

## comments

All units of code (files/modules, classes, functions) should have up-to-date purpose statements explaining the high level purpose of this unit of code and providing context for it. For files/modules, this should be at the top of the file, usually after imports. Whatever makes sense for that language. In Racket, you should put it before imports, but for most languages, it should go after. Follow language conventions.

For comments inside of a unit of code, don't include explanatory comments for obvious code like

```js
// increment x
x += 1
```

These comments are useless, redundant, distracting, and are proned to becoming out of date when code is updated

Internal comments are useful for
- justifying a seemingly strange choice of implementation. Like if you had to do something weird for a good reason, people are going to look at this code and question it if they don't know the reason. So include a comment to explain why the strange choice was made.
- for explaining something complicated. Although if the code is so complicated that it needs an explanatory comment, it should probably be simplified somehow instead.
- for TODO items. like if you're temporarily using a placeholder implementation, write a TODO comment for actually implementing it

## avoid duplication of logic. create abstractions

Don't write the same code twice with slight differences. Within reason, extract shared logic into utility functions or something like that. Sometimes it makes sense to pull these out into a utilities module. But avoid a big miscellaneous utilities module too. Keep things organized and single-purposed.
