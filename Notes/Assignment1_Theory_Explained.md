# Assignment 1: TypeScript & Object-Oriented Programming - Theory Explained

## Understanding TypeScript Fundamentals

TypeScript is a layer built on top of JavaScript that adds static type checking. At its core, TypeScript allows you to declare what type of data a variable, parameter, or return value should have. This catches errors before you run your code, making development safer and more reliable.

When you write TypeScript code, it gets compiled into regular JavaScript that browsers and Node.js can actually execute. The compiler checks your types during this compilation process and warns you about any mismatches. For example, if you declare a variable as a number but later try to treat it like a string, TypeScript will catch that mistake.

The main advantage of types is clarity. When someone reads your code—or when you read your own code months later—the types serve as inline documentation. You immediately know what kind of data flows through your functions and objects. This makes refactoring safer too, because you can't accidentally pass the wrong type of data somewhere.

## Object-Oriented Programming Concepts

Object-Oriented Programming (OOP) is a way of organizing code around objects, which represent things in your problem domain. Think of objects as bundles that contain both data (called properties) and behavior (called methods). For a card game like UNO, a Card object would have data like its color and number, and methods like how to display itself.

### Classes as Blueprints

A class is like a template or blueprint for creating objects. When you define a class, you're saying "all objects of this type will have these properties and methods." You only define the blueprint once, but you can create many instances (individual objects) from it. Each instance has its own copy of the properties, so one Card can be red while another is blue, even though they're both Card objects.

### Encapsulation and Access Control

Encapsulation is the idea of bundling related data and functions together while hiding internal details. In TypeScript, you control what's visible to the outside world using access modifiers. Public properties and methods can be accessed by anyone. Private properties and methods are only accessible within the class itself—from the outside, you can't see or modify them directly.

This is useful because it prevents other parts of your code from accidentally breaking your object's consistency. For example, a Game object might keep score internally. You might make the score private so other code can't change it directly, and instead provide a public method to award points that does validation and updates other related data correctly.

### Inheritance and Extending Behavior

Inheritance allows you to create a new class based on an existing one. The new class (called a child class or subclass) inherits all the properties and methods from the existing class (called a parent class or superclass), but can also add new properties or override existing methods to change their behavior.

In a game context, you might have a Card class and then create specialized classes like ActionCard or WildCard that extend Card. These specialized classes inherit the basic card behavior but add their own specific logic. This reduces code duplication because you don't have to rewrite the common card logic.

### Polymorphism Through Overriding

Polymorphism means "many forms." When a child class overrides a method from its parent class, it provides a different implementation while keeping the same interface. The outside world doesn't need to know whether it's dealing with a basic Card or a specialized ActionCard—it can call the same method on either one and get appropriate behavior.

For example, both a regular Card and a WildCard might have a `canPlayOn()` method that checks if they can be played on a given card. A regular card checks if the colors match, while a wild card can always be played. The calling code doesn't care about these differences—it just calls the method and gets the right answer.

## Understanding Game State and Logic

Game state refers to all the data that defines the current situation in your game: whose turn it is, what cards each player has, what the top card on the discard pile is, and so on. Game logic is the rules that govern how the state changes when actions happen.

In OOP design, you typically organize your code so that objects own the state they're responsible for. A Player object owns information about its hand, score, and whose turn it is. A Round object owns information about the current round, the discard pile, and which player should play next. The Game object orchestrates all of these pieces.

Good OOP design means that when you change the state, you do it through the object that owns that state. If you want to add a card to a player's hand, you tell the Player object to add it, rather than the Game object reaching into the Player's hand directly. This keeps the logic localized and makes it easier to ensure the state stays consistent.

## Method Delegation and Composition

As your game gets more complex, you'll often want one object to ask another object to do something rather than trying to do everything itself. If the Game object needs to know whose turn it is, instead of tracking that itself, it might ask the Round object, which is the object that actually manages turn order.

This is called delegation, and it's a cornerstone of good OOP design. It keeps responsibilities focused—each object does one job well. It also makes testing easier because you can test Round's turn logic independently from Game's overall logic.

## Dependency Injection

Dependency injection is a pattern where instead of an object creating the things it depends on internally, those things are provided to it from outside. For example, instead of a Game object creating its own random number generator to shuffle the deck, the Game could accept a shuffler as a parameter when it's created.

This might seem like extra work, but it provides real benefits. You can test the Game with a fake shuffler that produces predictable results instead of random ones. You can also swap in different implementations—maybe a different shuffling algorithm—without changing the Game class itself.

## Testing in TypeScript

Testing is checking that your code does what you expect. TypeScript makes testing easier because the types help you understand what your code should do, and the type checking catches whole categories of bugs before testing even starts.

When testing OOP code, you typically test each class in isolation, providing mock versions of the objects it depends on. This lets you verify that each class behaves correctly without being affected by bugs in other classes. Later, you can test how they work together. This structured approach catches bugs early and makes them easier to fix.
