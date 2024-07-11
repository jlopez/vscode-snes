#include <napi.h>
#include <asar/interface-lib.h>

// From https://github.com/nodejs/node-addon-api/blob/main/doc/object_wrap.md
class Asar : public Napi::ObjectWrap<Asar> {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    Asar(const Napi::CallbackInfo& info);

  private:
    static Napi::Value GetVersion(const Napi::CallbackInfo& info);
    static Napi::Value GetApiVersion(const Napi::CallbackInfo& info);
    static Napi::Value Reset(const Napi::CallbackInfo& info);
};

Napi::Object Asar::Init(Napi::Env env, Napi::Object exports) {
    // This method is used to hook the accessor and method callbacks
    Napi::Function func = DefineClass(env, "Asar", {
        StaticAccessor<&Asar::GetVersion>("version", static_cast<napi_property_attributes>(napi_enumerable)),
        StaticAccessor<&Asar::GetApiVersion>("apiVersion", static_cast<napi_property_attributes>(napi_enumerable)),
        StaticMethod<&Asar::Reset>("reset", static_cast<napi_property_attributes>(napi_enumerable)),
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

// Initialize native add-on
Napi::Object Init (Napi::Env env, Napi::Object exports) {
    Asar::Init(env, exports);
    return exports;
}

// Register and initialize native add-on
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)