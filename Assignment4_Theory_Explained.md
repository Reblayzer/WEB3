# Assignment 4: Functional Programming - Theory Explained

## The Philosophy of Functional Programming

Functional programming is a way of thinking about code based on the idea that computation is like mathematical functions: you feed in inputs, the function produces outputs, and the relationship between inputs and outputs is predictable and repeatable. This contrasts with object-oriented programming, which models programs as collections of objects that have state and methods.

In functional programming, you avoid changing data. Instead, when you need different data, you create new data based on the old. You also avoid side effects—code that does something besides computing its return value, like modifying a global variable or printing to the console. By following these principles, your code becomes easier to reason about, test, and parallelize.

## Immutability: Never Change, Always Create

Immutability means data doesn't change after creation. When you need different data, you create a new copy with the changes applied. The original remains untouched.

### Why This Matters

This seems wasteful at first—why create copies instead of modifying in place? The benefits are significant. First, it prevents bugs. If two parts of your code are using the same array and one part modifies it, the other part is affected, potentially in subtle ways that are hard to debug. With immutability, this can't happen. Second, immutability enables certain optimizations and features. Time-travel debugging (going back in time to see previous states) is trivial when you keep old states around. Undo/redo is just swapping between versions of state.

### How to Practice Immutability

In JavaScript and TypeScript, you use techniques like spread operators and array methods that return new arrays rather than modifying the original. Instead of `array.push(newItem)`, use `[...array, newItem]`. Instead of modifying an object, use the spread operator: `{ ...obj, propertyName: newValue }`. For nested structures, you might do something like `{ ...state, nested: { ...state.nested, property: newValue } }`.

### Perceived Performance

Creating new arrays and objects seems expensive compared to modifying in place. However, in practice, the cost is usually negligible unless you're working with enormous data structures. Modern JavaScript engines optimize this well. Moreover, the bugs you prevent and the easier testing more than make up for it. And when performance really matters, you can use techniques like structural sharing (sharing unchanged parts) where only the changed parts are new.

## Purity: Deterministic, Side-Effect-Free Functions

A pure function always returns the same output for the same input and has no side effects. Side effects are anything the function does besides computing its return value: modifying global state, printing, making API calls, using the current time or randomness.

### The Power of Pure Functions

Pure functions are mathematically well-behaved. You can reason about them locally without understanding everything else in the program. You can replace a function call with its result and get the same program behavior (referential transparency). Pure functions are easy to test because they're isolated—no setup of global state is needed.

### Making Impure Code Pure

Real programs need side effects—API calls, I/O, randomness. The trick is to isolate them. Instead of your core game logic calling an API, have the API call happen outside the game logic, and pass the result to the logic. Instead of your code generating random numbers, have randomness injected in. This keeps the core logic pure and testable.

### Example: Shuffling a Deck

An impure shuffle might use `Math.random()` internally. To test it, you can't be sure what order you'll get. A pure shuffle accepts a random function as a parameter. In production, pass the real `Math.random`. In tests, pass a fake that returns predictable values. Now your shuffle function is testable and pure, even though shuffling inherently involves randomness.

## Functional Libraries: Ramda and Lodash/FP

These libraries provide functions optimized for functional programming. They're auto-curried, meaning they can be partially applied, and they're designed for composition and piping.

### Ramda vs Standard JavaScript

JavaScript's built-in array methods (`map`, `filter`, `reduce`) work, but they're not optimized for functional style. Ramda (and Lodash/FP mode) provide versions that curry automatically, use consistent parameter ordering, and work well with composition. Instead of `array.map(...)` where the array comes first, Ramda's `map` takes the function first, returning a function waiting for an array. This makes composition natural.

### Common Operations

Both libraries provide the same basic functions: `map` (transform each element), `filter` (keep matching elements), `reduce` (accumulate), `find` (get first match), and many more. Learning one library gives you familiarity with the concepts that apply broadly.

## Pipelining: Composing Functions

Pipelining is arranging functions in sequence so that the output of one becomes the input of the next. Functional libraries make this easy.

### The Pipe Function

The `pipe` function takes several functions and produces a new function that applies them left-to-right. Your data flows through each transformation. This is intuitive because you read it in the order it happens: first filter, then map, then reduce.

### Compose vs Pipe

`Compose` applies functions right-to-left, which is the mathematical way. `Pipe` applies them left-to-right, which is the programming way (left-to-right is how we read). Choose whichever feels more natural for your code.

### Making Pipelines Readable

The key to readable pipelines is small, well-named functions. If each step in your pipeline is a function with a clear purpose, someone reading your code can understand the whole pipeline at a glance. Compare `pipe(filterPlayable, getTypes)` (clear) with `pipe(cards => cards.filter(c => canPlay(c)), cards => cards.map(c => c.type))` (less clear because the logic is inline).

## Currying: Functions That Return Functions

Currying is a technique where a function that takes multiple arguments becomes a function that takes one argument and returns a function that takes the next argument, and so on.

### Why Curry?

Currying enables partial application: fixing some arguments now and reusing that partially-applied function later. For example, if you have a `filter(predicate, array)` and you curry it, you can create `const filterRed = filter(card => card.color === 'RED')` and then use `filterRed` anywhere you need to filter for red cards.

### Manual vs Auto-Currying

You can manually write curried functions, or use a library that auto-curries for you. Manual currying gives you full control, while auto-currying libraries do the work for you. Ramda's functions are all auto-curried.

### Point-Free Style

When functions are curried and composed well, you can write "point-free" code: functions that don't mention their arguments. Instead of `cards => cards.map(card => card.type)`, with a curried map and a property getter, you might write just `map(prop('type'))`. The pipe operator handles threading the data through. This style is concise but can be harder to understand, so use it judiciously.

## Persistent Data Structures: Immutability at Scale

When you have large data structures, creating copies for every change is expensive. Persistent data structures solve this using structural sharing: sharing the unchanged parts between versions.

### How Structural Sharing Works

Imagine a tree structure. If you change a node deep in the tree, instead of copying the entire tree, you create new nodes only along the path from the root to the changed node. All the subtrees that didn't change are shared between old and new versions. This means you can have many versions of the data structure with much less memory overhead than copying.

### Using Immutable.js

The Immutable.js library provides data structures optimized for this: `List` (like an array), `Map` (like an object), `Set` (unique values), and more. When you use these, updates return new instances, but those instances share structure with the originals. To the outside world, the data is immutable, but behind the scenes, memory is efficiently shared.

### Records and Type Safety

Immutable.js provides `Record`, which is like a typed, immutable object. You define the shape once and then create instances of that record type. Records are particularly useful for game state where you want to ensure certain properties always exist and have the right type.

## Lazy Evaluation with Sequences

Sequences in Immutable.js provide lazy evaluation: operations aren't performed until the result is actually needed.

### Memory Efficiency

Imagine you have a list of 10,000 cards and you want to filter them, then map to get their types, then take the first 10. If you do this eagerly, you'd process all 10,000 cards through each operation. With sequences, the operation only processes what's needed to get the first 10 results. You might never process the last 9,990 cards.

### When to Use Sequences

Sequences are most valuable with large datasets and when you don't need all the results. For smaller datasets or when you need all results, the overhead of lazy evaluation might not be worth it. The nice thing is that you can write the same functional style either way; switching between eager and lazy evaluation is just changing List to Seq.

## Practical Application to Games

Functional programming is particularly valuable in game development. Game state is inherently complex—positions, velocities, states, interactions. Immutability makes it easier to reason about state changes. Purity makes game logic easy to test. Pipelines make complex transformations readable.

A game like UNO benefits from functional programming. The state (cards in hand, discard pile, whose turn) doesn't need to be mutable. Game logic (which cards can be played, what happens when a card is played) can be pure functions. Complex queries (get all red cards, get playable cards for current color) can be elegant pipelines.

The key is finding the right balance. Pure, immutable functions for your core game logic, but pragmatism for I/O (networking, sound, rendering) where side effects are unavoidable.
