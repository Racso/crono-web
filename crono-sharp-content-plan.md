# crono-sharp — Canvas Content Plan
## 6 columns × 4 rows — 24 quadrants

Each column maps to a chapter. Each row within the column goes deeper into that chapter. The canvas should feel wider than tall — chapters advance horizontally, depth advances vertically.

---

## Column 0 — Language Overview

### [0,0] — What is crono-sharp
**Tag:** language  
**Title:** crono-sharp  
**Subtitle:** C#-inspired · statically typed · compiles to crono-vm

**Stats block:**
- `.crono` — file extension
- `8` — compiler passes
- `C#` — syntax model
- `v1` — format

**Body:** crono-sharp is a statically-typed, C#-flavored language that compiles to crono-vm bytecode. OOP, generics, exceptions, and lightweight concurrency — in a clean multi-pass compiler. Not a C# runtime; a language that borrows C# syntax and idioms while targeting a purpose-built VM.

**KV table:**
| field | value |
|---|---|
| file extension | `.crono` |
| typing | static, inferred |
| OOP | classes, interfaces, single inheritance |
| concurrency | orbit / launch / channels |
| FFI | native extensions + dynamic FFI |
| GC | mark-and-sweep |

---

### [0,1] — Compilation Pipeline (overview)
**Tag:** compiler  
**Title:** pipeline  
**Subtitle:** source → scanner → parser → type checker → MIR → bytecode

**Architecture diagram (vertical chain):**
```
source (.crono)
    ↓ Scanner
tokenstream
    ↓ Parser
AST
    ↓ Symbol Binding
AST + symbol table
    ↓ Type Checker
typed AST
    ↓ Lowering Pass
  (generators → state machines, foreach expansion)
    ↓ MIR Lowerer
MIR (3-address, virtual registers, basic blocks)
    ↓ MIR VM Lowerer
bytecode + module data
```

**Note box:** Lowering + symbol binding + type checking run twice — once before and once after AST transforms — to ensure generators and foreach expansions are fully type-checked.

---

### [0,2] — Module System & Imports
**Tag:** modules  
**Title:** imports  
**Subtitle:** multi-file support · extension loading

**Code block:**
```cs
// import another crono-sharp file
import "math_utils.crono";

// load a native extension
extension "crono_websocket";
extension "crono_http";
```

**KV table:**
| concept | detail |
|---|---|
| `import` | merges another .crono file into compilation unit |
| `extension` | loads a native C++ extension at runtime |
| resolution | relative path from script |
| multiple imports | supported; symbols merge into same scope |
| circular imports | not supported |

---

### [0,3] — Known Limitations vs C#
**Tag:** compatibility  
**Title:** crono# vs C#  
**Subtitle:** what's in, what's out

**Two-column list (Implemented / Not Implemented):**

Implemented:
- classes, interfaces, single inheritance
- generics (functions + collections)
- try / catch / finally
- string interpolation `${...}`
- nullable types `T?`
- `var`, `const`, `dynamic`
- `foreach` on arrays + IEnumerable
- static methods
- visibility modifiers (public / private / space)
- `params` variadic arguments

NOT in crono-sharp:
- `get`/`set` properties
- delegates / events
- LINQ
- async / await (orbit instead)
- operator overloading
- pattern matching
- tuple syntax
- reflection
- `sealed`, `abstract`, `partial`
- null-aware operators (`?.`, `??`)
- generic constraints
- multiple inheritance

---

## Column 1 — Type System

### [1,0] — Primitive Types
**Tag:** types  
**Title:** primitives  
**Subtitle:** value types · stack-allocated

**Type table:**
| type | bits | notes |
|---|---|---|
| `int` | 32 | signed integer |
| `long` | 64 | signed integer |
| `float` | 32 | IEEE 754 |
| `double` | 64 | IEEE 754 |
| `bool` | — | `true` / `false` |
| `string` | — | immutable, interned |
| `void` | — | no-value return type |
| `dynamic` | — | runtime dispatch |

---

### [1,1] — Complex & Nullable Types
**Tag:** types  
**Title:** complex types  
**Subtitle:** reference types · nullable · generics

**Code block:**
```cs
// arrays
int[] nums = [1, 2, 3];
string[][] grid = ...;

// nullable — allows nil
string? name = nil;
int? count = nil;

// generics
List<int> items = List.New<int>();
Dict<string> map = Dict.New<string>();
Channel<bool> done = orbit task();

// dynamic
dynamic data = JSON.Parse(json);
string val = data["key"];
```

**KV table:**
| form | meaning |
|---|---|
| `T[]` | fixed-size array of T |
| `T?` | nullable T — may be nil |
| `List<T>` | resizable list of T |
| `Dict<V>` | string-keyed dictionary of V |
| `Set<T>` | unordered unique set of T |
| `Channel<T>` | async result channel |
| `dynamic` | type resolved at runtime |

---

### [1,2] — Type Inference & var
**Tag:** types  
**Title:** inference  
**Subtitle:** var · const · dynamic

**Code block:**
```cs
// var — inferred at declaration, then locked
var x = 42;         // inferred: int
var name = "Rex";   // inferred: string
var items = List.New<int>();

// const — immutable, must initialize
const int MAX = 100;
const string APP = "crono-sharp";

// dynamic — no static type
dynamic anything = JSON.Parse(json);
dynamic result = anything["status"];
```

**Note:** `var` locks to the inferred type. You cannot reassign a different type to a `var` variable. `dynamic` opts out of static checking entirely — use sparingly.

---

### [1,3] — Operators
**Tag:** operators  
**Title:** operators  
**Subtitle:** arithmetic · logic · bitwise · compound

**Op tables (4 groups):**

Arithmetic: `+` `-` `*` `/` `%`  
Comparison: `==` `!=` `<` `<=` `>` `>=`  
Logical: `&&` `||` `!`  
Bitwise: `&` `|` `^` `~` `<<` `>>`  
Assignment: `=` `+=` `-=` `*=` `/=` `%=`  
Unary: `-` `!` `~` `++` `--` (postfix)

**Note:** No null-coalescing `??` or null-conditional `?.`. No operator overloading. `+` works on strings for concatenation.

---

## Column 2 — Object-Oriented

### [2,0] — Classes & Objects
**Tag:** oop  
**Title:** classes  
**Subtitle:** reference types · init · fields · methods

**Code block:**
```cs
class Animal {
    public string name;
    public int age;

    void init(string n, int a) {
        this.name = n;
        this.age = a;
    }

    string describe() {
        return "${this.name} (${this.age})";
    }
}

Animal a = new Animal();
a.init("Rex", 3);
print(a.describe());
```

**KV table:**
| concept | detail |
|---|---|
| constructor | method named `init()` — call manually |
| `this` | reference to current instance |
| `new` | allocates on GC heap |
| fields | declared at class level |
| methods | instance or static |

---

### [2,1] — Inheritance
**Tag:** oop  
**Title:** inheritance  
**Subtitle:** single · virtual dispatch · method override

**Code block:**
```cs
class Dog : Animal {
    string sound;

    void init(string n) {
        this.name = n;
        this.age = 0;
        this.sound = "Woof";
    }

    string describe() {
        return "${this.name} says ${this.sound}";
    }
}

Animal a = new Dog();
a.init("Rex");
print(a.describe()); // → "Rex says Woof"
```

**KV table:**
| concept | detail |
|---|---|
| `class Child : Parent` | single inheritance only |
| method override | same name, same signature |
| virtual dispatch | automatic via vtable |
| field inheritance | child inherits all parent fields |
| `base` call | not supported — call parent directly if needed |

---

### [2,2] — Interfaces
**Tag:** oop  
**Title:** interfaces  
**Subtitle:** contracts · polymorphism · multiple implementations

**Code block:**
```cs
interface IGreeter {
    string Greet();
}

interface ISpeaker {
    void Speak();
}

class Hello : Animal, IGreeter, ISpeaker {
    string Greet() {
        return "Hello, ${this.name}!";
    }
    void Speak() {
        print(this.Greet());
    }
}

IGreeter g = new Hello();
g.init("World");
print(g.Greet());
```

**KV table:**
| concept | detail |
|---|---|
| `interface` | method-only contract, no fields |
| implementation | `class Foo : IBar, IBaz` |
| polymorphism | variable typed as interface |
| multiple interfaces | supported |
| base class + interfaces | `class Dog : Animal, ISound` |

---

### [2,3] — Access Modifiers & Static
**Tag:** oop  
**Title:** visibility  
**Subtitle:** public · private · space · static

**Code block:**
```cs
class Counter {
    private int count;        // only this class
    public string label;      // everywhere

    static int instances;     // class-level, no this

    static Counter Create(string lbl) {
        Counter c = new Counter();
        c.label = lbl;
        Counter.instances = Counter.instances + 1;
        return c;
    }

    void increment() {
        this.count = this.count + 1;
    }
}
```

**KV table:**
| modifier | scope |
|---|---|
| `public` | accessible everywhere |
| `private` | within the class only (default) |
| `space` | within the same file/module |
| `static` | class-level; no `this` access |

---

## Column 3 — Control Flow & Functions

### [3,0] — Conditionals & Loops
**Tag:** control flow  
**Title:** flow  
**Subtitle:** if · for · while · foreach · break · continue

**Code block:**
```cs
// conditional
if (x > 0) {
    print("positive");
} else if (x == 0) {
    print("zero");
} else {
    print("negative");
}

// classic for
for (int i = 0; i < 10; i++) {
    if (i == 5) continue;
    if (i == 8) break;
    print(i);
}

// while
while (queue.Count() > 0) {
    process(queue.Get(0));
    queue.Remove(0);
}

// foreach — arrays and IEnumerable
foreach (string item in list) {
    print(item);
}
```

---

### [3,1] — Functions
**Tag:** functions  
**Title:** functions  
**Subtitle:** typed params · return types · generics · params

**Code block:**
```cs
// regular function
int add(int a, int b) {
    return a + b;
}

// void function
void log(string msg) {
    print("[LOG] " + msg);
}

// generic function — T inferred at call site
T identity<T>(T x) {
    return x;
}
List<T> wrap<T>(T item) {
    List<T> l = List.New<T>();
    l.Add(item);
    return l;
}

// variadic params
string format(string tpl, params dynamic... args) {
    return String.Format(tpl, args);
}
```

---

### [3,2] — Exceptions
**Tag:** exceptions  
**Title:** exceptions  
**Subtitle:** try · catch · finally · throw

**Code block:**
```cs
try {
    int result = riskyOp();
    if (result < 0) {
        throw new Exception("negative result");
    }
} catch (Exception e) {
    print("Error: " + e.message);
} finally {
    cleanup();
}
```

**KV table:**
| concept | detail |
|---|---|
| `throw` | throws any Exception instance |
| `catch (Exception e)` | catches all exceptions (one type) |
| `e.message` | string message on exception |
| `finally` | always executes (success or exception) |
| cross-function | exceptions propagate up the call stack |
| re-throw | `throw e;` inside catch block |

**Note:** Only `Exception` base class catch is supported. No typed exception hierarchy (no `catch (IOException e)` etc.).

---

### [3,3] — Generators & yield
**Tag:** async  
**Title:** generators  
**Subtitle:** yield · state machine · orbit resumption

**Code block:**
```cs
// generator — lowered to state machine
void counter(int max) {
    int i = 0;
    while (i < max) {
        yield;           // suspend execution here
        print(i);
        i++;
    }
}

// run via orbit
Channel<void> ch = orbit counter(5);
ch.wait();               // runs to completion
```

**KV table:**
| concept | detail |
|---|---|
| `yield` | suspends function, saves locals as `__state` fields |
| lowering | compiler transforms to state machine class at compile time |
| `orbit func()` | spawns generator/async function, returns `Channel<T>` |
| `ch.wait()` | blocks until channel has a value |
| `ch.send(v)` | sends a value into the channel |

---

## Column 4 — Standard Library

### [4,0] — Collections
**Tag:** stdlib  
**Title:** collections  
**Subtitle:** List · Dict · Set · Channel

**Code block:**
```cs
// List<T>
List<int> nums = List.New<int>();
nums.Add(1); nums.Add(2);
int first = nums.Get(0);
int count = nums.Count();
nums.Remove(0);

// Dict<V>
Dict<string> map = Dict.New<string>();
map.Set("key", "value");
string v = map.Get("key");
bool has = map.ContainsKey("key");
List<string> keys = map.Keys();

// Set<T>
Set<int> seen = Set.New<int>();
seen.Add(42);
bool found = seen.Contains(42);
List<int> items = seen.ToList();

// Channel<T>
Channel<int> ch = orbit compute();
int result = ch.wait();
```

**KV table for each type:**  
List: `New<T>()` `Add(v)` `Get(i)` `Set(i,v)` `Count()` `Remove(i)` `With(v)`  
Dict: `New<V>()` `Set(k,v)` `Get(k)` `ContainsKey(k)` `Remove(k)` `Keys()` `Count()`  
Set: `New<T>()` `Add(v)` `Contains(v)` `Remove(v)` `Count()` `ToList()`  

---

### [4,1] — String & Math
**Tag:** stdlib  
**Title:** string · math  
**Subtitle:** String.* · Math.* · interpolation

**String methods:**
`Length(s)` `ToUpper(s)` `ToLower(s)` `Substring(s,start,len)` `Contains(s,sub)` `StartsWith(s,p)` `EndsWith(s,p)` `IndexOf(s,sub)` `LastIndexOf(s,sub)` `Replace(s,from,to)` `Trim(s)` `Split(s,delim)` `Join(arr,sep)` `Format(tpl,...)`

**Code — interpolation:**
```cs
string name = "crono";
int ver = 1;
string msg = "${name} v${ver}";   // → "crono v1"

// verbatim string (no escapes)
string raw = @"path\to\file";
```

**Math methods:**
`Abs` `Sqrt` `Pow` `Round` `Floor` `Ceil` `Min` `Max` `Sin` `Cos` `Tan` `Asin` `Acos` `Atan` `Atan2` `Log` `Log10` `Exp` `PI` `E`

---

### [4,2] — I/O & System
**Tag:** stdlib  
**Title:** IO · system  
**Subtitle:** files · console · env · time

**Code block:**
```cs
// File I/O
string content = IO.ReadFile("data.txt");
IO.WriteFile("out.txt", content);
IO.AppendFile("log.txt", "entry\n");
bool exists = IO.FileExists("data.txt");
List<string> files = IO.ListDirectory("./");

// Console
Console.Print("hello");
string line = Console.ReadLine();

// System
string[] args = System.Args();
string home = System.GetEnv("HOME");
System.Exit(0);

// Time
double now = Time.Now();
Time.Sleep(100);
string ts = Time.Format(now, "%Y-%m-%d");
```

**KV table:**
| class | key methods |
|---|---|
| `IO` | ReadFile, WriteFile, AppendFile, FileExists, ListDirectory, CreateDirectory, DeleteFile |
| `Console` | Print, ReadLine, ReadAll, ReadLineTimeout |
| `System` | Args, GetEnv, Exit, Execute, ScriptPath |
| `Time` | Now, Sleep, GetTicksMs, Format |
| `Path` | Combine, GetDirectoryName |

---

### [4,3] — JSON, Encoding & Utilities
**Tag:** stdlib  
**Title:** json · encoding · utils  
**Subtitle:** JSON · Base64 · Hash · Random · Assert · GC

**Code block:**
```cs
// JSON
dynamic obj = JSON.Parse("{\"x\":1}");
int x = obj["x"];
string json = JSON.Serialize(map);
dynamic val = JSON.Path(obj, "a.b.c");

// Encoding
string b64 = Encoding.Base64Encode(data);
string hex = Encoding.HexEncode(bytes);
string mac = Encoding.HmacSha256(key, msg);

// Random
int n = Random.NextInt(0, 100);
double d = Random.NextDouble();
Random.Seed(42);

// Assert (tests)
Assert.True(x == 1, "x must be 1");
Assert.False(list.Count() == 0, "must not be empty");
Assert.Fail("unreachable");

// GC
int bytes = GC.GetAllocatedBytes();
int objs = GC.GetObjectCount();
```

---

## Column 5 — Concurrency & Extensions

### [5,0] — Concurrency: orbit · launch · Channel
**Tag:** concurrency  
**Title:** concurrency  
**Subtitle:** orbit · launch · Channel · yield

**Code block:**
```cs
// orbit — coroutine-like, returns Channel<T>
int compute(int n) {
    Time.Sleep(10);
    return n * n;
}
Channel<int> ch = orbit compute(5);
int result = ch.wait();   // → 25

// launch — fire-and-forget thread
void worker() {
    print("running in background");
}
launch worker();

// channel messaging
Channel<string> pipe = Channel.New<string>();
// sender:
pipe.send("hello");
// receiver:
string msg = pipe.wait();
```

**KV table:**
| concept | detail |
|---|---|
| `orbit f()` | spawns coroutine task, returns `Channel<T>` |
| `launch f()` | spawns thread, no return value |
| `ch.wait()` | blocks caller until value is ready |
| `ch.send(v)` | delivers value to waiting channel |
| `Channel<void>` | used with generators (yield) |
| state machine | generators lowered to state machines by compiler |

---

### [5,1] — Native Extensions
**Tag:** extensions  
**Title:** extensions  
**Subtitle:** C++ native modules · type-safe at compile time

**Code block:**
```cs
// load a native extension
extension "crono_websocket";
extension "crono_http";
extension "crono_process";

// use its API (type-checked against signatures)
int conn = WS.Connect("wss://api.example.com", "{}");
WS.Send(conn, "{\"action\":\"ping\"}");
string msg = WS.Receive(conn, 5000);
WS.Close(conn);

// HTTP
string body = HTTP.Get("https://example.com", headers);
string res = HTTP.Post(url, payload, headers);
```

**KV table:**
| extension | key API |
|---|---|
| `crono_websocket` | WS.Connect, Send, Receive, Poll, Close |
| `crono_http` | HTTP.Get, Post (with headers) |
| `crono_process` | Process.Run, Spawn, Kill |
| `crono_js` | JS context embedding |
| `crono_window` | Window.Open, Update, Close, IsClosed |

---

### [5,2] — Dynamic FFI
**Tag:** extensions  
**Title:** dynamic FFI  
**Subtitle:** Dynamic.Load · runtime DLL binding

**Code block:**
```cs
// load a native library at runtime
dynamic MathLib = Dynamic.Load("ucrtbase.dll");

// call C functions directly
double s = MathLib.sin(1.5707963);   // → 1.0
double c = MathLib.cos(0.0);         // → 1.0
double p = MathLib.pow(2.0, 10.0);   // → 1024.0

// any cdecl/stdcall function works
dynamic SysLib = Dynamic.Load("mylib.so");
int result = SysLib.my_function(42);
```

**KV table:**
| concept | detail |
|---|---|
| `Dynamic.Load(path)` | loads shared lib, returns dynamic handle |
| method calls | resolved at runtime against exported symbols |
| argument types | `int`, `long`, `float`, `double`, `string` |
| return type | `dynamic` — caller casts as needed |
| vs `extension` | extension: typed, compile-checked · FFI: runtime, untyped |

---

### [5,3] — C API & Embedding
**Tag:** api  
**Title:** C API  
**Subtitle:** embed crono-vm · call from C / C# · native functions

**Code block (C++):**
```cpp
// create VM
CronoVM* vm = crono_vm_create(&config);

// load bytecode
crono_vm_load(vm, bytecode, length);

// register native function
NativeFunction fn = {
  "Math.Sin", "double", {"double"},
  [](Memory* mem, ...) { /* impl */ }
};
crono_vm_register_native(vm, &fn);

// run
StepResult r = crono_vm_run(vm);

// teardown
crono_vm_destroy(vm);
```

**KV table:**
| API | description |
|---|---|
| `crono_vm_create(config)` | allocate new VM instance |
| `crono_vm_load(vm, bytes, len)` | load compiled bytecode |
| `crono_vm_run(vm)` | execute until halt or error |
| `crono_vm_step(vm)` | single-step execution |
| `crono_vm_register_native(vm, fn)` | bind native C function |
| `crono_vm_destroy(vm)` | teardown + GC flush |
| C# interop | `CronoVM.cs` wrapper at `interop/csharp/` |

---

## Grid Summary

```
         Col 0           Col 1           Col 2           Col 3           Col 4           Col 5
Row 0  Overview        Primitives      Classes         Flow/Loops      Collections     Concurrency
Row 1  Pipeline        Complex types   Inheritance     Functions       String/Math     Extensions
Row 2  Imports         Inference/var   Interfaces      Exceptions      IO/System       Dynamic FFI
Row 3  Limits vs C#    Operators       Visibility      Generators      JSON/Utils      C API
```

Total: 24 quadrants. Each quadrant has: tag · title · subtitle · primary content (stats / arch / code / table / kv) · optional note.
