import * as t from "io-ts";
export module REModels {
  export const simpleTsType = t.union([
    t.literal("string"),
    t.literal("number"),
    t.literal("boolean"),
    t.literal("void"),
    t.literal("null"),
    t.literal("undefined")
  ]);

  export const simpleReType = t.union([
    t.literal("unit"),
    t.literal("bool"),
    t.literal("float"),
    t.literal("string")
  ]);

  export type SimpleREType = t.TypeOf<typeof simpleReType>;
  export type SimpleTSType = t.TypeOf<typeof simpleTsType>;
  export type SimpleType = {
    type: t.TypeOf<typeof simpleReType>;
  };

  export type FunctionType = {
    type: "function";
    symbolName: string;
    annotations: string[];
    parameterSymbols: { symbolName: string; type: REType }[];
    returnType: REType;
  };

  export type RecordType = {
    type: "record";
    symbolName: string;
    annotations: string[];
    properties: {
      symbolName: string;
      type: REType;
    }[];
  };
  export type REType = SimpleType | FunctionType | RecordType;

  export type ExternalBinding = {
    jsModulePath: string;
    reasonName: string;
    jsName: string;
    annotations: string[];
    type: string;
  };
  export type Module = {
    name: string;
    vals: ExternalBinding[];
    types: REType[];
  };
}
