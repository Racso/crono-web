# crono-vm — Agent Reference

Source verified against: `src/vm_abi/`, `src/vm_runtime/`, `src/vm_api/` as of 2026-05-23.

---

## Overview

crono-vm is a register-based bytecode virtual machine. Instructions are 32-bit words (fixed-width). Each instruction encodes its opcode in the low 8 bits of the first word; additional operands are packed as 8-bit fields in the same word or in subsequent words (each also 32 bits). The IP is a `uint32_t*` pointer into a flat `std::vector<uint32_t>` bytecode buffer.

- **Bytecode format**: `CRONO_VM` magic (8 bytes), version `uint32_t`, entryPoint `uint32_t`, metadataOffset `uint64_t`. Header is 24 bytes (`BYTECODE_HEADER_SIZE`). Current version: `1`.
- **Word size**: 32 bits.
- **Register model**: each call frame has a fixed number of registers (`maxRegs`, embedded in the function header word). Registers are indexed as slots into a flat `std::vector<Value>` stack. Globals occupy the bottom of that same stack.
- **Dispatch**: computed goto (GCC label-as-value) on `OpCode` cast from the low 8 bits of the current word.
- **Execution limit**: configurable via `CronoConfig::maxOpcodes`; returns `StepResult::ERROR` when exceeded.

---

## Value Types

### `ValueType` (enum class, `types_core.hpp`)

| Enumerator  | C++ storage          | Notes                                  |
|-------------|----------------------|----------------------------------------|
| `NIL`       | —                    | Default-constructed `Value`            |
| `BOOL`      | `bool`               |                                        |
| `INT`       | `int32_t`            |                                        |
| `LONG`      | `int64_t`            |                                        |
| `FLOAT`     | `float`              |                                        |
| `DOUBLE`    | `double`             |                                        |
| `OBJ`       | `vm::Object*`        | Heap-allocated, GC-managed             |
| `ADDRESS`   | `int` (bytecode idx) | Absolute word index into bytecode; `typeOf()` returns `"function"` |
| `VOID_TYPE` | —                    | Declared in enum; no constructor; not produced by `typeOf()` |

`Value` is a tagged union (`value.hpp`). `typeOf(Value)` returns a human-readable string; returns `typeName` field for `NATIVE_OBJECT`.

### `ObjType` (enum class, `types_core.hpp`)

All heap objects (`vm::Object*`) have an `ObjType` tag:

| Enumerator        | C++ struct             | Notes                                               |
|-------------------|------------------------|-----------------------------------------------------|
| `STRING`          | `vm::String`           | Interned; `char* chars`, `int length`, `uint32_t hash` |
| `NATIVE`          | `vm::Native`           | Wraps a `NativeFn` (`std::function<Value(Memory*, int, Value*)>`) |
| `CLASS`           | `vm::Class`            | `classId`, `baseClassId` (-1 = no base), `fieldCount`, `methodOffsets` |
| `INSTANCE`        | `vm::Instance`         | `vm::Class* cls`, `std::vector<Value> fields`       |
| `ARRAY`           | `vm::Array`            | `int length`, `Value* elements` (raw heap)          |
| `MODULE`          | `vm::Module`           | `vm::String* name`, `void* handle` (DLL handle)     |
| `DYNAMIC_FUNCTION`| `vm::DynamicFunction`  | `vm::String* name`, `void* func_ptr` (FFI symbol)   |
| `BUFFER`          | `vm::Buffer`           | `int count`, `uint8_t* data` (raw byte buffer)      |
| `NATIVE_OBJECT`   | `vm::NativeObject`     | `void* ptr`, `const char* typeName`, destructor, tracer |
| `SYNC_HANDLE`     | `vm::SyncHandle`       | `Value payload`, `bool ready`; used by orbit scheduler |

---

## Opcodes

All opcodes have `OperandType::OPERAND_NONE` in the metadata table (all operands are inline in the instruction word stream, not a separate operand encoding). The `OpCode` enum is `uint8_t`.

The function header word (at the bytecode offset that `CALL`/`ORBIT_SPAWN` target) encodes: `[isVariadic:1 | arity:15 | maxRegs:16]`.

Arguments are packed 4 slots per word (8 bits each), loaded in sequence after the primary instruction word.

| Opcode | Encoding (words) | Operation | Notes |
|--------|-----------------|-----------|-------|
| `BREAKPOINT` | `[op:8, _:24]` | Pause execution | Returns `PAUSED` in debug mode; no-op otherwise |
| `GC_COLLECT` | `[op:8, _:24]` | Force GC collection | |
| `NONE` | `[op:8, _:24]` | No-op | |
| `WIDE` | `[op:8, _:24]` | No-op / prefix placeholder | |
| `RETURN` | `[op:8, _:24]` | Return `reg[0]` to caller | Pops frame; signals orbit completion if in spawned orbit |
| `SET_GLOBAL` | `[op:8, globalSlot:8, type:2, slot:8]` | Write value to global slot | Old format |
| `GET_GLOBAL` | `[op:8, dst:8, globalSlot:16]` | Copy global → local reg | |
| `SET_GLOBAL_REG` | `[op:8, globalSlot:16, src:8]` | Copy local reg → global | |
| `GET_GLOBAL_WIDE` | `[op:8, local:8, global:16]` | Copy global → local (wide index) | |
| `SET_GLOBAL_WIDE` | `[op:8, local:8, global:16]` | Copy local → global (wide index) | |
| `LOAD_CONSTANT_WIDE` | `[op:8, local:8, constIdx:16]` | Load constant table entry → local | |
| `SET_LOCAL` | `[op:8, dst:8, type:2, slot:8]` | Write decoded operand → local reg | |
| `ADD` | `[op:8, dst:8, left:8, right:8]` | `dst = left + right` | Dynamic; string concatenation via `addValues` |
| `SUB` | `[op:8, dst:8, left:8, right:8]` | `dst = left - right` | |
| `MUL` | `[op:8, dst:8, left:8, right:8]` | `dst = left * right` | |
| `DIV` | `[op:8, dst:8, left:8, right:8]` | `dst = left / right` | |
| `MOD` | `[op:8, dst:8, left:8, right:8]` | `dst = left % right` | |
| `AND` | `[op:8, dst:8, left:8, right:8]` | Bitwise AND | |
| `OR` | `[op:8, dst:8, left:8, right:8]` | Bitwise OR | |
| `XOR` | `[op:8, dst:8, left:8, right:8]` | Bitwise XOR | |
| `LSHIFT` | `[op:8, dst:8, left:8, right:8]` | Left shift | |
| `RSHIFT` | `[op:8, dst:8, left:8, right:8]` | Right shift | |
| `NEG` | `[op:8, dst:8, src:8, _:8]` | Arithmetic negate | |
| `NOT` | `[op:8, dst:8, src:8, _:8]` | Logical NOT (`isFalsey`) | `nil` and `false` are falsey |
| `BITWISE_NOT` | `[op:8, dst:8, src:8, _:8]` | Bitwise NOT | |
| `JUMP` | `[op:8, target:24]` | Unconditional jump | Sets `ip = bytecode.data() + target` |
| `JUMP_IF` | `[op:8, target:24] [w2]` | Jump if second word's slot evaluates truthy | |
| `SET_BOOL_EQ` | `[op:8, dst:8, left:8, right:8]` | `dst = (left == right)` | Dynamic equality |
| `SET_BOOL_NE` | `[op:8, dst:8, left:8, right:8]` | `dst = (left != right)` | |
| `SET_BOOL_LT` | `[op:8, dst:8, left:8, right:8]` | `dst = (left < right)` | |
| `SET_BOOL_GT` | `[op:8, dst:8, left:8, right:8]` | `dst = (left > right)` | |
| `SET_BOOL_LE` | `[op:8, dst:8, left:8, right:8]` | `dst = (left <= right)` | |
| `SET_BOOL_GE` | `[op:8, dst:8, left:8, right:8]` | `dst = (left >= right)` | |
| `SET_BOOL_EQ_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = (left.i32 == right.i32)` | Typed INT; skips dynamic dispatch |
| `SET_BOOL_NE_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = (left.i32 != right.i32)` | |
| `SET_BOOL_LT_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = (left.i32 < right.i32)` | |
| `SET_BOOL_GT_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = (left.i32 > right.i32)` | |
| `SET_BOOL_LE_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = (left.i32 <= right.i32)` | |
| `SET_BOOL_GE_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = (left.i32 >= right.i32)` | |
| `INC_INT` | `[op:8, dst:8, _:16]` | `dst.i32++` | In-place increment |
| `DEC_INT` | `[op:8, dst:8, _:16]` | `dst.i32--` | In-place decrement |
| `ADD_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = left.i32 + right.i32` | |
| `SUB_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = left.i32 - right.i32` | |
| `MUL_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = left.i32 * right.i32` | |
| `DIV_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = left.i32 / right.i32` | Raises error on divisor == 0 |
| `MOD_INT` | `[op:8, dst:8, left:8, right:8]` | `dst = left.i32 % right.i32` | Raises error on mod 0; result sign follows divisor |
| `BRANCH_LT_INT` | `[op:8, left:8, right:8, _:8] [_:8, trueTarget:16, ...] [_:8, falseTarget:16, ...]` | if `left.i32 < right.i32` jump trueTarget else falseTarget | 3-word superinstruction |
| `BRANCH_LE_INT` | same shape | `left.i32 <= right.i32` | |
| `BRANCH_GT_INT` | same shape | `left.i32 > right.i32` | |
| `BRANCH_GE_INT` | same shape | `left.i32 >= right.i32` | |
| `BRANCH_EQ_INT` | same shape | `left.i32 == right.i32` | |
| `BRANCH_NE_INT` | same shape | `left.i32 != right.i32` | |
| `CALL` | `[op:8, callee:8, result:8, argc:8] [argSlots…]` | Call callee with argc args; result → result reg | Supports `ADDRESS` (bytecode) and `NATIVE` and `DYNAMIC_FUNCTION` callees |
| `GET_VAR_COUNT` | `[op:8, dst:8, _:16]` | `dst = actual_argc - fixed_arity` | Variadic: number of extra args |
| `GET_VAR_ARG` | `[op:8, dst:8, indexReg:8, _:8]` | `dst = vararg[index]` | |
| `INSTANTIATE_CLASS` | `[op:8, dst:8, classReg:8, _:8]` | Allocate new instance of class in classReg | Fields initialised to NIL |
| `BUILTIN_CONSTRUCT` | `[op:8, dst:8, typeId:8, _:8]` | Invoke builtin factory by typeId index | typeId indexes `builtinFactories` table built from `getStandardNativeTypes()` |
| `GET_FIELD_REG` | `[op:8, dst:8, obj:8, fieldSlot:8]` | `dst = instance.fields[fieldSlot]` | fieldSlot is integer index, not name |
| `SET_FIELD_REG` | `[op:8, src:8, obj:8, fieldSlot:8]` | `instance.fields[fieldSlot] = src` | |
| `INVOKE_METHOD` | `[op:8, dst:8, obj:8, methodSlot:8] [argc:8, _:24] [argSlots…]` | Call `instance.cls.methodOffsets[methodSlot]`; pushes receiver as arg[0] | |
| `INVOKE_METHOD_BY_NAME` | `[op:8, dst:8, obj:8, _:8] [nameConstIdx:16, argc:8, _:8] [argSlots…]` | Lookup method by name string; falls back to callable field | Requires Metadata; errors if absent |
| `GET_FIELD_BY_NAME` | `[op:8, dst:8, obj:8, _:8] [nameConstIdx:16, _:16]` | Field lookup by name | Requires Metadata |
| `SET_FIELD_BY_NAME` | `[op:8, src:8, obj:8, _:8] [nameConstIdx:16, _:16]` | Field store by name | Requires Metadata |
| `NEW_ARRAY` | `[op:8, dst:8, sizeReg:8, _:8]` | Allocate array of `sizeReg` elements (all NIL) | sizeReg must be INT; negative size raises error |
| `LOAD_ELEMENT` | `[op:8, dst:8, obj:8, index:8]` | `dst = obj[index]` | Works on `ARRAY` (→ Value) and `BUFFER` (→ INT byte) |
| `STORE_ELEMENT` | `[op:8, obj:8, index:8, value:8]` | `obj[index] = value` | `BUFFER` only accepts INT; truncated to `uint8_t` |
| `ARRAY_LENGTH` | `[op:8, dst:8, obj:8, _:8]` | `dst = length/count` | Works on `ARRAY` and `BUFFER` |
| `ORBIT_SPAWN` | `[op:8, callee:8, dst:8, argc:8] [argSlots…]` | Spawn cooperative coroutine; dst = `SyncHandle*` | Native callee runs synchronously and returns pre-signaled handle; bytecode callee enqueued |
| `ORBIT_SPAWN_METHOD` | `[op:8, dst:8, obj:8, methodSlot:8] [argc:8, _:24] [argSlots…]` | Spawn method as orbit | Receiver pushed as arg[0] |
| `ORBIT_YIELD` | `[op:8, _:24]` | Cooperative yield to next ready orbit | No-op if no other orbits |
| `LAUNCH_NATIVE` | `[op:8, callee:8, dst:8, argc:8] [argSlots…]` | Run native function on OS thread; dst = `SyncHandle*` | Only callable on `NATIVE` objects; result enqueued via `memory->enqueueWake` |
| `THROW_ERROR` | `[op:8, src:8, _:16]` | Raise error from register | Walks exception table; unwinds frames; throws `CronoError::Runtime` if unhandled |
| `GET_ERROR` | `[op:8, dst:8, _:16]` | Copy current error value to dst; clear error flag | |
| `IS_INSTANCE` | `[op:8, dst:8, src:8, _:8]` | `dst = (src.isObj && src.objType == INSTANCE)` | |
| `INSTANCE_OF` | `[op:8, dst:8, src:8, classReg:8]` | `dst = (src instanceof classReg)` | Walks `baseClassId` chain |

---

## Execution Model

### Call frames

`CallFrame` (`call_frame.hpp`):
```cpp
struct CallFrame {
    uint32_t* ip;         // Instruction pointer
    int slots;            // Absolute stack index of reg[0] for this frame
    int functionStart;    // Bytecode word index of the function header word
    int argCount;         // Total args passed (including 'this' for methods)
    int resultLocal;      // Caller's local slot to store return value (-1 = discard)
};
```
`GLOBAL_FRAME_START = -1` marks the top-level `_main` frame.

`RETURN` reads `reg[0]` as the return value. Stack is trimmed to `callerStackBase`; return value written to `caller.reg[resultLocal]` if `resultLocal != -1`.

### Stack layout

Globals occupy the bottom `[0, globalsEnd)` of the stack. Each call frame's registers start at `frame.slots`. Native functions, class objects, and user globals all live as `Value`s in global slots, indexed by `Metadata::globalNames`.

### Falsey values

Only `nil` and `false` (BOOL) are falsey. All other values — including `0` (INT) — are truthy.

### Error handling

`raiseError(Value)` walks the flat `ExceptionTable` (from `ModuleData`) comparing `errorPC` against `[startPC, endPC)`. On match, the current frame's IP jumps to `handlerPC`. If no entry matches, frames are popped until one matches or the frame stack is exhausted. `GET_ERROR` retrieves the error value and clears the flag.

`ExceptionEntry` has types `CATCH` and `FINALLY` but the runtime does not differentiate them in the walk — both redirect IP to `handlerPC`.

### Variadic functions

`isVariadic` flag is bit 31 of the function header word. `arity` is bits [16,30]. Variadic args are laid out at `reg[arity..arity+varCount-1]`. Use `GET_VAR_COUNT` and `GET_VAR_ARG` to access them.

---

## Memory & GC

- **Allocator**: `Memory::allocate<T>(args...)` — bumps `bytesAllocated`, links into the singly-linked object list (`Object::next`).
- **GC algorithm**: tri-color mark-and-sweep (incremental tracing via `grayStack`).
- **Trigger**: automatic when `bytesAllocated > nextGC` (initial threshold: 1 MB). `nextGC = bytesAllocated * 2` after each collection. Also triggered by `GC_COLLECT` opcode or `DEBUG_STRESS_GC` compile flag.
- **Roots**: all live stack values `[0, liveTop)`, all constants, plus whatever `markRootsCallback` marks (used by the orbit scheduler to mark spawned-orbit stacks).
- **String interning**: all strings are interned in `Memory::strings` (`unordered_multimap<uint32_t, vm::String*>` keyed by hash). `copyString` / `takeString` return the canonical pointer.
- **Constant table**: only `STRING` objects may be stored in the constant pool via the `addConstant` overloads.
- **Raw memory**: `allocateRaw` / `deallocateRaw` for `Array::elements` and `Buffer::data`; not tracked by GC object count.
- **NativeObject tracing**: if `vm::NativeObject::trace != nullptr`, it is called with `(ptr, Memory*)` during `traceReferences`. Use `crono_mark_value` inside the tracer to keep GC-managed values alive.

---

## Module System

### Bytecode module

`ModuleData` (`module_data.hpp`) carries:
- `ClassesTable classes` — `std::vector<ClassData>` (fieldCount, baseClassId, methodOffsets).
- `ConstantsTable constants` — `std::vector<RawConstant>` (variant of monostate/bool/int32/int64/float/double/string/ConstantAddress).
- `ExceptionTable exceptionTable`.
- `std::vector<ExtensionRequest> extensions`.
- `std::vector<NativeType> extraNativeTypes`.

### Metadata (optional)

`Metadata` (`metadata.hpp`) is stripped in production builds. When present:
- `std::vector<int> lines` — one entry per bytecode word; maps word index → source line.
- `SymbolTable symbols` — `unordered_map<int, FunctionSymbols>` keyed by `functionStart` offset.
- `std::map<std::string, int> globalNames` — name → absolute stack slot.
- `std::map<int, ClassMetadata> classes` — classId → names/signatures.
- `std::map<std::string, int> builtinTypeIds`.

Absence of Metadata causes `INVOKE_METHOD_BY_NAME`, `GET_FIELD_BY_NAME`, `SET_FIELD_BY_NAME` to throw at runtime.

### Module file resolution

`ModuleLoader` resolves `.crono` source files by path. Supports wildcard patterns `*` and `**`. Script directory is set globally via `ModuleLoader::setScriptDirectory`.

### Dynamic extensions

Extensions are shared libraries exporting:
```c
void crono_setup(CronoRegistry* registry);   // CronoExtensionSetupFn
void crono_init(CronoVM* vm);                // CronoExtensionInitFn  (optional)
```
`CronoRegistry` carries function/type registration callbacks. Loaded via `crono_load_extension(vm, path)` or declared in `ModuleData::extensions` at compile time.

---

## Native Extensions / FFI

### Native functions (`NativeFn`)

```cpp
using NativeFn = std::function<Value(Memory* memory, int argCount, Value* args)>;
```
Args are a pointer into the VM stack; they are valid only for the duration of the call. `memory` may be `nullptr` when called from `LAUNCH_NATIVE` background thread.

Register before `VM::run()` via `VM::defineNative(name, fn)` or `VM::registerNatives(vector<NativeFunction>)`. Calling after execution has started throws `CronoError::Runtime`.

### FFI (`ffi.hpp` / `ffi.cpp`)

`FFI::call(void* func, vector<Value> args, FFIResultType returnType)` wraps dyncall. Supported arg types: INT, LONG, DOUBLE, FLOAT, BOOL, OBJ (as pointer). `FFIResultType`: `INTEGER` (→ `int32_t`), `DOUBLE`, `POINTER` (→ `vm::Object*`), `VOID_TYPE`. Return type is inferred by callee-side heuristic: any float/double arg → `DOUBLE`, else `INTEGER`.

`DynamicFunction` objects hold a raw `void*` symbol. `FFI::getSymbol` wraps `dlFindSymbol`.

### Orbit scheduler (async)

The VM is single-threaded with cooperative multitasking ("orbits"). `ORBIT_SPAWN` and `ORBIT_SPAWN_METHOD` enqueue a new `OrbitState` into `readyOrbits`. Scheduling is round-robin; the current orbit is saved to `readyOrbits` on yield/suspend and the next orbit is loaded via `loadNextOrbit`. Suspension happens when a native sets `memory->pendingSuspend`; resumption when `memory->enqueueWake` is called (thread-safe). `LAUNCH_NATIVE` starts a real OS thread (stored in `VM::launchedThreads`, joined on `VM::~VM`).

---

## C API (`crono_api.h`)

All functions are `extern "C"`, exported with `CRONO_API`.

```c
// Lifecycle
CronoVM* crono_create();
void     crono_destroy(CronoVM* vm);

// Execution
int crono_run(CronoVM* vm, const char* source);   // compile + run; 0 on success
int crono_call(CronoVM* vm, const char* func_name, int argc,
               const CronoValue* argv, CronoValue* result);  // 0 on success
int crono_get_global(CronoVM* vm, const char* name, CronoValue* result);
int crono_get_field(CronoVM* vm, CronoValue instance, const char* name, CronoValue* result);
int crono_set_field(CronoVM* vm, CronoValue instance, const char* name, CronoValue value);

// Native registration
int crono_register_function(CronoVM* vm, const char* name,
                            const char** param_types, int param_count,
                            CronoNativeCallback callback);

// Extensions
int crono_load_extension(CronoVM* vm, const char* path);
int crono_create_instance(CronoVM* vm, const char* class_name, CronoValue* result);

// Error
const char* crono_get_last_error(CronoVM* vm);

// Debugger
CronoStepResult crono_step(CronoVM* vm);
int  crono_get_current_line(CronoVM* vm);
int  crono_get_frame_count(CronoVM* vm);
void crono_get_frame_info(CronoVM* vm, int index, CronoFrameInfo* info);
int  crono_get_stack_value(CronoVM* vm, int index, CronoValue* result);

// Buffer
int crono_get_buffer_info(CronoVM* vm, CronoValue buffer, void** ptr, int* size);

// GC tracing (call from inside CronoTracerFn)
void crono_mark_value(void* gc_ctx, CronoValue val);
```

### `CronoValue`

```c
typedef struct {
    CronoValueType type;
    union {
        int boolean;
        int integer;
        double floating;
        const char* string;
        void* pointer;
        struct { void* ptr; const char* type_name; } native_object;
    } data;
    void* _gc_ref;  // internal; do not use
} CronoValue;
```

`CronoValueType`: `CRONO_VAL_NIL`, `CRONO_VAL_BOOL`, `CRONO_VAL_INT`, `CRONO_VAL_FLOAT`, `CRONO_VAL_STRING`, `CRONO_VAL_POINTER`, `CRONO_VAL_BUFFER`, `CRONO_VAL_NATIVE_OBJECT`, `CRONO_VAL_ERROR`.

`CronoStepResult`: `CRONO_STEP_OK=0`, `CRONO_STEP_DONE=1`, `CRONO_STEP_ERROR=2`, `CRONO_STEP_PAUSED=3`.

Type mapping C API ↔ internal: `INT` ↔ `int32_t` (LONG and DOUBLE are not exposed via `CronoValueType`; DOUBLE maps to FLOAT in conversion, LONG is not mapped). Instances/arrays without a specific mapping are exposed as `CRONO_VAL_POINTER`.

### `CronoRegistry`

```c
struct CronoRegistry {
    void* client_data;
    CronoRegisterFunctionFn register_function;
    void (*set_module_name)(CronoRegistry*, const char*);
    CronoRegisterTypeFn     register_type;
};
```

---

## Known Limitations / TODOs

- **LONG / DOUBLE not in C API**: `ValueType::LONG` and `ValueType::DOUBLE` have no corresponding `CronoValueType`; `internalToC` converts FLOAT → FLOAT (`double` field) and drops LONG / DOUBLE silently to `CRONO_VAL_NIL`. Agents passing 64-bit floats or longs across the C boundary will lose data.
- **VOID_TYPE not used**: `ValueType::VOID_TYPE` is declared in the enum but no constructor, accessor, or `typeOf` branch exists for it.
- **`ExceptionEntry::Type` (CATCH vs FINALLY) ignored**: Both types are treated identically in `raiseError`; no distinction in the runtime walk.
- **WIDE opcode is a no-op**: `lbl_WIDE` does nothing. It is listed in `opcodes.def` but the deserializer / VM loop has no special prefix handling for it.
- **Dynamic dispatch requires Metadata**: `INVOKE_METHOD_BY_NAME`, `GET_FIELD_BY_NAME`, `SET_FIELD_BY_NAME` all throw if `metadata == nullptr`. Production builds that strip metadata cannot use dynamic-typed variables.
- **FFI return type heuristic**: `callValue` for `DynamicFunction` picks return type based on whether any argument is float/double — this is unreliable for functions with no float args that return a double.
- **Orbit deadlock detection is basic**: detected only when all orbits are suspended and no in-flight `LAUNCH_NATIVE` threads exist; otherwise spins with `std::this_thread::yield`.
- **No marks for NATIVE_OBJECT fields**: `vm::NativeObject::trace` must be provided by the extension author; the VM does not automatically trace fields stored inside native objects.
- **Constant pool only holds strings as ObjType**: `Memory::addConstant(Value)` rejects non-string objects at runtime. Only primitives and strings may be constants.
