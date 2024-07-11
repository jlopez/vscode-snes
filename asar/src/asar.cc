#include <napi.h>
#include <asar/interface-lib.h>
#include <map>

// From https://github.com/nodejs/node-addon-api/blob/main/doc/object_wrap.md
class Asar : public Napi::ObjectWrap<Asar> {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    Asar(const Napi::CallbackInfo& info);

  private:
    static Napi::Value GetVersion(const Napi::CallbackInfo& info);
    static Napi::Value GetApiVersion(const Napi::CallbackInfo& info);
    static Napi::Value Reset(const Napi::CallbackInfo& info);
    static Napi::Value Patch(const Napi::CallbackInfo& info);
    static Napi::Value MaxRomSize(const Napi::CallbackInfo& info);
    static Napi::Value Errors(const Napi::CallbackInfo& info);
};

Napi::Object Asar::Init(Napi::Env env, Napi::Object exports) {
    // This method is used to hook the accessor and method callbacks
    Napi::Function func = DefineClass(env, "Asar", {
        StaticAccessor<&Asar::GetVersion>("version", static_cast<napi_property_attributes>(napi_enumerable)),
        StaticAccessor<&Asar::GetApiVersion>("apiVersion", static_cast<napi_property_attributes>(napi_enumerable)),
        StaticMethod<&Asar::Reset>("reset", static_cast<napi_property_attributes>(napi_enumerable)),
        StaticMethod<&Asar::Patch>("patch", static_cast<napi_property_attributes>(napi_enumerable)),
        StaticAccessor<&Asar::MaxRomSize>("maxRomSize", static_cast<napi_property_attributes>(napi_enumerable)),
        StaticAccessor<&Asar::Errors>("errors", static_cast<napi_property_attributes>(napi_enumerable)),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();

    // Create a persistent reference to the class constructor. This will allow
    // a function called on a class prototype and a function
    // called on instance of a class to be distinguished from each other.
    *constructor = Napi::Persistent(func);
    exports.Set("Asar", func);

    // Store the constructor as the add-on instance data. This will allow this
    // add-on to support multiple instances of itself running on multiple worker
    // threads, as well as multiple instances of itself running in different
    // contexts on the same thread.
    //
    // By default, the value set on the environment here will be destroyed when
    // the add-on is unloaded using the `delete` operator, but it is also
    // possible to supply a custom deleter.
    env.SetInstanceData<Napi::FunctionReference>(constructor);

    return exports;
}

Asar::Asar(const Napi::CallbackInfo& info) :
    Napi::ObjectWrap<Asar>(info) {
}

Napi::Value Asar::GetVersion(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), asar_version());
}

Napi::Value Asar::GetApiVersion(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), asar_apiversion());
}

Napi::Value Asar::Reset(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), asar_reset());
}

Napi::Value Asar::Patch(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  auto options = info[0].As<Napi::Object>();
  auto assemblyPath = options.Get("assemblyPath").As<Napi::String>().Utf8Value();
  auto romSizeHint = options.Get("romSizeHint").As<Napi::Number>();
  auto includePaths = options.Get("includePaths").As<Napi::Array>();
  auto defines = options.Get("defines").As<Napi::Object>();
  auto stdIncludesPath = options.Get("stdIncludesPath").As<Napi::String>();
  auto stdDefinesPath = options.Get("stdDefinesPath").As<Napi::String>();
  auto generateChecksum = options.Get("generateChecksum").As<Napi::Boolean>();
  auto fullCallStack = options.Get("fullCallStack").As<Napi::Boolean>();

  auto romlen = romSizeHint.IsNumber() ? romSizeHint.Int32Value() : 1048576;
  auto romdata = new char[romlen];

  auto patchParams = patchparams {
    .structsize = sizeof(patchparams),
    .patchloc = assemblyPath.c_str(),
    .romdata = romdata,
    .buflen = romlen,
    .romlen = &romlen,
  };

  if (includePaths.IsArray()) {
    int count = includePaths.Length();
    auto ptr = new const char*[count];
    for (auto i = 0; i < count; i++) {
      auto path = includePaths.Get(i).As<Napi::String>().Utf8Value();
      ptr[i] = strdup(path.c_str());
    }
    patchParams.numincludepaths = count;
    patchParams.includepaths = ptr;
  }

  if (defines.IsObject()) {
    auto defKeys = defines.GetPropertyNames();
    int count = defKeys.Length();
    auto ptr = new definedata[patchParams.additional_define_count];
    for (auto i = 0; i < count; i++) {
      auto key = defKeys.Get(i).As<Napi::String>().Utf8Value();
      auto value = defines.Get(key).As<Napi::String>().Utf8Value();
      ptr[i] = definedata {
        .name = strdup(key.c_str()),
        .contents = strdup(value.c_str()),
      };
    }
    patchParams.additional_defines = ptr;
    patchParams.additional_define_count = count;
  }

  if (stdIncludesPath.IsString()) {
    patchParams.stdincludesfile = strdup(stdIncludesPath.Utf8Value().c_str());
  }

  if (stdDefinesPath.IsString()) {
    patchParams.stddefinesfile = strdup(stdDefinesPath.Utf8Value().c_str());
  }

  if (generateChecksum.IsBoolean()) {
    patchParams.override_checksum_gen = true;
    patchParams.generate_checksum = generateChecksum.Value();
  }

  patchParams.full_call_stack = fullCallStack.ToBoolean().Value();

  auto rv = asar_patch(&patchParams);

  delete[] romdata;

  for (auto i = 0; i < patchParams.additional_define_count; i++) {
    free(const_cast<char *>(patchParams.additional_defines[i].name));
    free(const_cast<char *>(patchParams.additional_defines[i].contents));
  }
  if (patchParams.additional_defines)
    delete[] patchParams.additional_defines;

  for (auto i = 0; i < patchParams.numincludepaths; ++i) {
    free(const_cast<char *>(patchParams.includepaths[i]));
  }
  if (patchParams.includepaths)
    delete[] patchParams.includepaths;

  if (patchParams.stdincludesfile)
    free(const_cast<char *>(patchParams.stdincludesfile));

  if (patchParams.stddefinesfile)
    free(const_cast<char *>(patchParams.stddefinesfile));

  return Napi::Boolean::New(env, rv);
}

Napi::Value Asar::MaxRomSize(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), asar_maxromsize());
}

Napi::Value Asar::Errors(const Napi::CallbackInfo& info) {
  auto env = info.Env();
  auto errorCount = 0;
  auto errors = asar_geterrors(&errorCount);
  auto errorList = Napi::Array::New(env, errorCount);
  for (auto i = 0; i < errorCount; i++) {
    auto error = errors[i];

    auto stackEntries = Napi::Array::New(env, error.callstacksize);
    for (auto j = 0; j < error.callstacksize; j++) {
      auto stackEntry = error.callstack[j];
      auto stackEntryObj = Napi::Object::New(env);
      stackEntryObj.Set("fullPath", Napi::String::New(env, stackEntry.fullpath));
      stackEntryObj.Set("prettyPath", Napi::String::New(env, stackEntry.prettypath));
      stackEntryObj.Set("lineNumber", Napi::Number::New(env, stackEntry.lineno));
      stackEntryObj.Set("details", Napi::String::New(env, stackEntry.details));
      stackEntries.Set(j, stackEntryObj);
    }

    auto errorObj = Napi::Object::New(env);
    errorObj.Set("fullError", Napi::String::New(env, error.fullerrdata));
    errorObj.Set("rawError", Napi::String::New(env, error.rawerrdata));
    errorObj.Set("block", Napi::String::New(env, error.block));
    errorObj.Set("filename", Napi::String::New(env, error.filename));
    errorObj.Set("line", Napi::Number::New(env, error.line));
    errorObj.Set("stackEntries", stackEntries);
    errorObj.Set("errorName", Napi::String::New(env, error.errname));
    errorList.Set(i, errorObj);
  }
  return errorList;
}

// Initialize native add-on
Napi::Object Init (Napi::Env env, Napi::Object exports) {
    Asar::Init(env, exports);
    return exports;
}

// Register and initialize native add-on
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)