# crono-sharp

crono-sharp is a statically-typed, C#-inspired programming language that compiles to [crono-vm](https://crono.rac.so/vm.md) bytecode. Source files use the `.crono` extension. The language offers classes, interfaces, generics, exceptions, cooperative concurrency, and native FFI — all in a clean multi-pass compiler. Source lives at [github.com/Racso/crono-lang](https://github.com/Racso/crono-lang).

---

## Quick start

```crono
// hello.crono
print("Hello, world!");
```

```crono
// factorial.crono
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
print(factorial(10));
```

Run with the `crono` executable:

```bash
./build/src/crono hello.crono
```

---

## Compiler pipeline

crono-sharp compiles in eight passes:

| Pass | Component | Task |
|------|-----------|------|
| 1 | Scanner | Tokenization |
| 2 | Parser | Build AST |
| 3 | Preprocessor | Early transforms (import merging, foreach expansion setup) |
| 4 | Symbol Binding | Resolve all identifiers to their declarations |
| 5 | Type Checker | Validate types, compute field layouts |
| 6 | Lowerer | AST → MIR (mid-level IR) |
| 7 | Symbol Binding + Type Checker | Re-run post-lowering (generators and foreach expansions must be typed) |
| 8 | MIR VM Lowerer | MIR → crono-vm bytecode |

---

## Types

### Primitive types

| Type   | Description |
|--------|-------------|
| int    | 32-bit signed integer |
| long   | 64-bit signed integer |
| float  | 32-bit floating point |
| double | 64-bit floating point |
| bool   | `true` or `false` |
| string | Interned UTF-8 string |

Primitives are value types stored directly in VM registers. `nil` is the zero value for reference types.

### Reference types

Everything allocated on the heap is a reference type: objects (class instances), arrays, and `dynamic`. Only `nil` and `false` are falsey — including `0` (int), which is truthy.

### Type inference

The compiler infers types from initializers and return expressions. Explicit annotations are optional when the type is unambiguous:

```crono
int x = 42;           // explicit
string s = "hello";   // explicit
```

---

## Variables and scope

Variables are declared with their type (or inferred). Scope follows blocks. Top-level declarations are global.

```crono
int counter = 0;

void increment() {
    counter = counter + 1;
}
```

### Constants

```crono
const int MAX = 100;
```

### Compound assignment operators

`+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, `>>=` are all supported.

---

## Control flow

```crono
// if / else
if (x > 0) {
    print("positive");
} else {
    print("non-positive");
}

// while
while (count < 10) {
    count = count + 1;
}

// for
for (int i = 0; i < 10; i += 1) {
    print(i);
}

// foreach (over arrays and collections)
foreach (int item in items) {
    print(item);
}

// break / continue
while (true) {
    if (done) break;
}
```

---

## Functions

```crono
int add(int a, int b) {
    return a + b;
}

// Void return
void greet(string name) {
    print("Hello, " + name);
}

// Variadic
void printAll(string first, ...string rest) {
    print(first);
    for (int i = 0; i < varCount; i += 1) {
        print(varArg(i));
    }
}
```

Functions are first-class values and can be assigned to variables or passed as arguments.

---

## Classes

```crono
class Animal {
    public string name;
    public int age;

    void init(string n, int a) {
        this.name = n;
        this.age = a;
    }

    void speak() {
        print(this.name + " makes a sound.");
    }
}

Animal cat = Animal();
cat.init("Whiskers", 3);
cat.speak();
```

### Inheritance

```crono
class Dog : Animal {
    void speak() {
        print(this.name + " barks.");
    }
}
```

Single inheritance. A subclass may override any method. `instanceof` checks the full inheritance chain.

### Interfaces

```crono
interface Printable {
    void print();
}

class Report : Printable {
    void print() {
        print("Report contents...");
    }
}
```

### Visibility

Fields and methods may be declared `public` or left package-private (default). `static` members belong to the class rather than an instance.

### Callable fields

A field that holds a function value can be called directly:

```crono
class Handler {
    public void() onEvent;
}
Handler h = Handler();
h.onEvent = void() { print("event!"); };
h.onEvent();
```

---

## Generics

Generic functions and collections are monomorphically specialised at compile time.

```crono
// Generic function
T identity<T>(T x) {
    return x;
}
int n = identity(42);
string s = identity("hello");

// Multiple type parameters
B pickSecond<A, B>(A a, B b) {
    return b;
}
```

Generic collections (`List<T>`, `Dict`, `Channel<T>`) are built-in.

---

## Collections

### Arrays

```crono
int[] numbers = new int[5];
numbers[0] = 10;
int len = numbers.length;
```

### List\<T\>

```crono
List<int> items = new List<int>();
items.add(1);
items.add(2);
int first = items.get(0);
int count = items.size();
```

### Dict

```crono
Dict d = new Dict();
Dict.Set(d, "key", "value");
string v = Dict.Get(d, "key");
```

---

## Exceptions

```crono
try {
    throw new Exception("something went wrong");
} catch (Exception e) {
    print("Caught: " + e.message);
} finally {
    print("Always runs.");
}
```

Exceptions propagate up call frames until caught. An unhandled exception terminates the program with a runtime error.

---

## Concurrency — orbits

crono-sharp uses cooperative multitasking. `orbit` spawns a coroutine; `yield` gives up the CPU; `Channel<T>` is used to wait for a result.

```crono
int compute() {
    return 42;
}

Channel<int> ch = orbit compute();
int result = ch.wait();   // suspends until compute() returns
```

```crono
void worker() {
    print("step 1");
    yield;
    print("step 2");
}

orbit worker();
print("between steps");
// output: step 1 → between steps → step 2
```

`launch` runs a function on a real OS thread (for blocking I/O or CPU-heavy work):

```crono
Channel<int> ch = launch slowComputation();
int result = ch.wait();
```

---

## Imports

`import` merges another `.crono` file into the current compilation unit. All symbols share the same scope.

```crono
import "math_utils.crono";
import "collections/linked_list.crono";
```

There is no package system — imports are file-level and relative to the script directory. Circular imports are not supported.

---

## Native extensions

`extension` loads a native C++ shared library at runtime:

```crono
extension "build/src/extensions/http/crono_http";

string response = HTTP.Get("https://example.com", "{}");
```

Extensions expose types and functions via `CronoRegistry`. Any type or function registered before `crono_run()` is available as a global in crono-sharp code.

### Dynamic FFI

For lighter integration, `dynamic` functions can call arbitrary C symbols at runtime without a full extension:

```crono
dynamic lib = loadLibrary("libm.so");
double result = lib.sqrt(2.0);
```

---

## String literals

Standard strings use double quotes. Verbatim strings (no escape processing) use `@`:

```crono
string normal   = "Hello\nWorld";
string verbatim = @"Hello\nWorld";    // backslash is literal
string json     = @"{""name"": ""Crono""}";  // double-quote escaping
```

---

## Modules and the standard library

The following are available without any import:

| Module / Type | Description |
|---------------|-------------|
| `print(v)`    | Print any value to stdout |
| `List<T>`     | Resizable generic list |
| `Dict`        | String-keyed map |
| `Channel<T>`  | Orbit synchronisation primitive |
| `Exception`   | Base exception type (`message` field) |
| `GC`          | Garbage collector queries (`GetAllocatedBytes`, `GetObjectCount`) |
| `JSON`        | JSON parse / stringify (via built-in or extension) |

---

## Compiler source structure

```
src/lang_crono_sharp/
  scanner.cpp              // tokenization
  parser.cpp               // AST construction (ast.hpp)
  compiler_preprocessor.cpp
  compiler_symbol_binding.cpp
  compiler_type_checker.cpp
  compiler_lowerer.cpp     // AST → MIR
src/ir/
  mir.hpp / mir.cpp        // MIR data structures
  mir_vm_lowerer.cpp       // MIR → crono-vm bytecode
```

---

## See also

- [crono-vm](https://crono.rac.so/vm.md) — the virtual machine crono-sharp compiles to
- [Source repository](https://github.com/Racso/crono-lang)
- [Interactive reference](https://crono.rac.so/sharp)
