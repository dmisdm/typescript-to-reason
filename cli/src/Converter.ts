import { REModels } from "./REModels";
import { Type, SourceFile, Signature, Symbol } from "ts-morph";

export module Converters {
  export const convertSimple = (
    tsType: REModels.SimpleTSType
  ): REModels.SimpleType => {
    switch (tsType) {
      case "number":
        return { type: "float" };

      case "string":
        return { type: "string" };

      case "boolean":
        return { type: "bool" };

      case "void":
      case "null":
      case "undefined":
        return { type: "unit" };
    }
  };

  export const convertStructure = ({
    name,
    type,
    file
  }: {
    name: string;
    type: Type;
    file: SourceFile;
  }): REModels.RecordType => {
    type.getProperties().forEach(s =>
      convertTSSymbol({
        symbol: s,
        file
      })
    );
    return {
      annotations: [],
      symbolName: name,
      properties: [],
      type: "record"
    };
  };

  export const convertFunction = ({
    signature,
    name,
    isConstructor
  }: {
    name: string;
    signature: Signature;
    isConstructor: boolean;
  }): [REModels.FunctionType, REModels.REType[]] => {
    const parameters = signature.getParameters();
    const returnType = signature.getReturnType();

    return {
      annotations: isConstructor ? ["@bs.new"] : [],
      symbolName: name,
      parameterSymbols: parameters.map(param => ({symbolName: param.getName(), type: })),
      returnType: {
        type: "unit"
      },
      type: "function"
    };
    /*  const parameters = signature.getParameters();
      const returnType = signature.getReturnType();
    
      const dependencies = [] as Declaration[];
    
      const convertedParameters = parameters.map(param => {
        const paramType = param.getTypeAtLocation(sourceFile);
        const alias = paramType.getAliasSymbol();
    
        const identifier = `${sanitizeReasonVariableName(
          alias ? alias.getName() : param.getName()
        )}`;
        const reType = tsTypeToReType({
          sourceFile,
          type: paramType,
          identifier
        });
    
        if ("error" in reType) {
          throw reType;
        } else {
          dependencies.push(...reType.declaration.dependencies);
          return reType;
        }
      });
      const returnTypeAliasSymbol = returnType.getAliasSymbol();
      const returnTypeSymbol = returnType.getSymbol();
      const id = returnType.isAnonymous()
        ? identifier
          ? `${identifier}ReturnType`
          : sanitizeReasonVariableName(uuidv4())
        : returnTypeAliasSymbol
        ? sanitizeReasonVariableName(returnTypeAliasSymbol.getName())
        : returnTypeSymbol
        ? sanitizeReasonVariableName(returnTypeSymbol.getName())
        : sanitizeReasonVariableName(uuidv4());
      const convertedReturnType = tsTypeToReType({
        sourceFile,
        type: returnType,
        identifier: id
      });
    
      if ("error" in convertedReturnType) {
        return {
          error: {
            message: `Could not convert return type: ${returnType.getText()}`,
            typeText: returnType.getText()
          }
        };
      }
      dependencies.unshift(...convertedParameters.map(p => p.declaration));
      dependencies.unshift(convertedReturnType.declaration);
      dependencies.unshift(...convertedReturnType.declaration.dependencies);
      const def = `${
        !convertedParameters.length
          ? "unit"
          : convertedParameters.length === 1
          ? convertedParameters[0].declaration.string
          : convertedParameters.length > 1
          ? `(${convertedParameters.map(t => t.declaration.string).join(", ")})`
          : "unit"
      } => ${convertedReturnType.declaration.string}`;
      return {
        declaration: {
          type: "Simple",
          dependencies,
          annotations: [],
          string: def,
          definition: def
        } as Declaration & { dependencies: Declaration[] }
      }; */
  };

  export const convertTSSymbol = ({
    symbol: _symbol,
    parentSymbol,
    file
  }: {
    symbol: Symbol;
    parentSymbol?: Symbol;
    file: SourceFile;
  }): REModels.REType => {
    const symbol = _symbol.getAliasedSymbol() || _symbol;
    const type = symbol.getDeclaredType() || symbol.getTypeAtLocation(file);

    if (type.getConstructSignatures().length) {
      //TODO: This will ignore static members and only choose the first constructor definition
      return convertFunction({
        isConstructor: true,
        name: symbol.getName(),
        signature: type.getConstructSignatures()[0]
      });
    } else if (type.isObject()) {
    }

    const typeText = type.getText();
    if (REModels.simpleTsType.is(typeText)) {
      return convertSimple(typeText);
    }
    return {
      type: "unit"
    };
  };
}
