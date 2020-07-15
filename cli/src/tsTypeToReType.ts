import {
  Type,
  SourceFile,
  ClassDeclaration,
  Symbol,
  TypeFlags,
  SymbolFlags,
  Signature,
  TypeChecker,
  ts
} from "ts-morph";
import { symbol } from "prop-types";
import * as t from "io-ts";
import { sanitizeReasonNonModuleName } from "./util";
const uuidv4 = require("uuid/v4");
const simpleType = t.union([
  t.literal("string"),
  t.literal("number"),
  t.literal("boolean"),
  t.literal("void"),
  t.literal("null"),
  t.literal("undefined")
]);

const simpleType2RE = (
  type: t.TypeOf<typeof simpleType>
): "float" | "string" | "bool" | "unit" => {
  switch (type) {
    case "number":
      return "float";

    case "string":
      return "string";

    case "boolean":
      return "bool";

    case "void":
    case "null":
    case "undefined":
      return "unit";
  }
};

export type Declaration =
  | {
      type: "Simple";
      definition: string;
      annotations: string[];
      string: string;
    }
  | {
      type: "Complex";
      identifier: string;
      //module: string;
      definition: string;
      annotations: string[];
      string: string;
    };

const fnToRe = ({
  signature,
  sourceFile,
  identifier
}: {
  sourceFile: SourceFile;
  signature: Signature;
  identifier?: string;
}) => {
  const parameters = signature.getParameters();
  const returnType = signature.getReturnType();

  const dependencies = [] as Declaration[];

  const convertedParameters = parameters.map(param => {
    const paramType = param.getTypeAtLocation(sourceFile);
    const alias = paramType.getAliasSymbol();

    const identifier = `${sanitizeReasonNonModuleName(
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
      : sanitizeReasonNonModuleName(uuidv4())
    : returnTypeAliasSymbol
    ? sanitizeReasonNonModuleName(returnTypeAliasSymbol.getName())
    : returnTypeSymbol
    ? sanitizeReasonNonModuleName(returnTypeSymbol.getName())
    : sanitizeReasonNonModuleName(uuidv4());
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
  };
};

export const tsTypeToReType = ({
  sourceFile,
  type,
  identifier
}: {
  identifier?: string;
  sourceFile: SourceFile;
  type: Type;
}):
  | {
      declaration: Declaration & {
        dependencies: Declaration[];
      };
    }
  | {
      error: {
        message: string;
        typeText: string;
      };
    } => {
  const typeText = type.getBaseTypeOfLiteralType().getText();

  const constructSignatures = type.getConstructSignatures();

  if (constructSignatures.length !== 0) {
    // isClass
    //TODO: Handle all construct signatures
    const first = constructSignatures[0];

    const reFn = fnToRe({
      signature: first,
      identifier: `${sanitizeReasonNonModuleName(typeText)}Constructor`,
      sourceFile
    });
    if (reFn.error) {
      return reFn;
    }

    return {
      declaration: {
        type: "Simple",
        dependencies: reFn.declaration.dependencies,
        annotations: ["@bs.new"],
        definition: reFn.declaration.definition,
        string: reFn.declaration.definition
      }
    };
  } else if (type.getCallSignatures().length > 0) {
    //TODO handle all call signatures
    const reFn = fnToRe({
      signature: type.getCallSignatures()[0],
      identifier,
      sourceFile
    });
    if (reFn.error) {
      return reFn;
    }

    return {
      declaration: {
        type: "Simple",
        annotations: [],
        string: reFn.declaration.definition,
        definition: reFn.declaration.definition,
        dependencies: [...reFn.declaration.dependencies, reFn.declaration]
      }
    };
  } else if (type.isInterface()) {
    console.log("INTERFACE", type);
  } else if (type.isObject()) {
    const dependencies = [] as Declaration[];
    const properties = type.getProperties().map(p => {
      const type = p.getTypeAtLocation(sourceFile);
      if (!type) {
        throw new Error("Could not get type for symbol");
      }
      const reType = tsTypeToReType({ sourceFile, type });

      if ("error" in reType) {
        throw new Error("Could not convert ts type to re type");
      }
      dependencies.unshift(reType.declaration);
      dependencies.unshift(...reType.declaration.dependencies);
      return { reType, symbol: p };
    });

    const def = `
{
  ${properties
    .map(
      p =>
        `${sanitizeReasonNonModuleName(p.symbol.getName())}: ${
          p.reType.declaration.string
        }`
    )
    .join(",\n")}
}
            `;
    const id = identifier || uuidv4();
    return {
      declaration: {
        dependencies,
        annotations: ["@bs.deriving abstract"],
        string: id,
        identifier: id,
        type: "Complex",
        definition: def
      }
    };
  } else if (type.isArray()) {
    console.log("Array", type);
  } else if (simpleType.is(typeText)) {
    return {
      declaration: {
        type: "Simple",
        dependencies: [],
        annotations: [],
        definition: simpleType2RE(typeText),
        string: simpleType2RE(typeText)
      }
    };
  }
  return {
    error: {
      message: "Could not convert TS type to RE type",
      typeText
    }
  };
};
