import { REModels } from "./REModels";
import { sanitizeReasonNonModuleName, sanitizeReasonModuleName } from "./util";
import { Utils } from "./CommonUtils";

export module Renderer {
  const getSymbolForType = (type: REModels.REType) =>
    "symbolName" in type ? type.symbolName : type.type;

  const renderExternal = ({
    reasonName,
    modulePath,
    jsName,
    type,
    annotations
  }: {
    annotations: string[];
    reasonName: string;
    modulePath: string;
    jsName: string;
    type: string;
  }) =>
    `[@bs.module "${modulePath}"]
  ${annotations
    .map(annotation => `[${annotation}]`)
    .join("\n")}external ${renderValueNameAndType(
      reasonName,
      type
    )} = "${jsName}";`;

  const renderValueNameAndType = (name: string, type: string) =>
    `${sanitizeReasonNonModuleName(name)}: ${sanitizeReasonNonModuleName(
      type
    )}`;

  const renderRecord = (type: REModels.RecordType) => {
    return `type ${sanitizeReasonNonModuleName(type.symbolName)} = {
    ${type.properties.map(
      p => `${renderValueNameAndType(p.symbolName, getSymbolForType(p.type))}`
    )}
  }`;
  };

  const renderFunction = (type: REModels.FunctionType) => {
    return `type ${sanitizeReasonNonModuleName(type.symbolName)} = ${
      !type.parameterSymbols.length
        ? "unit"
        : type.parameterSymbols.length >= 1
        ? `(${type.parameterSymbols
            .map(
              s =>
                `~${renderValueNameAndType(
                  s.symbolName,
                  getSymbolForType(s.type)
                )}`
            )
            .join(", ")})`
        : "unit"
    } => ${getSymbolForType(type.returnType)}`;
  };

  const renderType = (type: REModels.REType) => {
    return type.type === "record"
      ? [renderRecord(type)]
      : type.type === "function"
      ? [renderFunction(type)]
      : [];
  };
  export const renderModule = (module: REModels.Module) => {
    return `
  module ${sanitizeReasonModuleName(module.name)} = {
  ${Utils.leftPadEachLine(module.types.flatMap(renderType).join(";\n"))}
  ${Utils.leftPadEachLine(
    module.vals
      .map(val =>
        renderExternal({
          jsName: val.jsName,
          reasonName: val.reasonName,
          modulePath: val.jsModulePath,
          type: val.type,
          annotations: val.annotations
        })
      )
      .join(";\n")
  )}
  };
  `;
  };
}
