/* import * as fs from "fs";
import * as path from "path";
import { Project } from "ts-morph";
import * as yargs from "yargs";
import { Declaration, tsTypeToReType } from "./tsTypeToReType";
import { sanitizeReasonModuleName, sanitizeReasonVariableName } from "./util";

const { output } = yargs.options({
  output: {
    demandOption: true,
    type: "string"
  }
}).argv;

type ConvertableDeclaration = {
  modulePath: string;
  valueName: string;
  externalName: string;
  annotations: string[];
  typeString: string;
};

const project = new Project({
  tsConfigFilePath: path.resolve(__dirname, "../tsconfig.json")
});

const program = project.getProgram();
const checker = program.getTypeChecker();
const convertedFiles: {
  [k: string]: ConvertableDeclaration[] | undefined;
} = {};
const dependencies = [] as Declaration[];
project.getSourceFiles().forEach(file => {
  const fileSymbol = file.getSymbol();
  if (fileSymbol) {
    const exports = checker.getExportsOfModule(fileSymbol);
    const converted = (convertedFiles[
      file.getBaseName()
    ] = [] as ConvertableDeclaration[]);
    exports.forEach(symbol => {
      {
        const type = symbol.getDeclaredType() || symbol.getTypeAtLocation(file);
        const exportType = tsTypeToReType({
          sourceFile: file,
          type
        });
        if ("error" in exportType) {
          console.error(exportType);
          return;
        }
        dependencies.push(...exportType.declaration.dependencies);
        const exportName = symbol.getName();
        converted.push({
          externalName: exportName,
          valueName:
            type.getConstructSignatures().length > 0
              ? `make${exportName}`
              : exportName,
          annotations: exportType.declaration.annotations,
          typeString: exportType.declaration.string,
          modulePath: file
            .getEmitOutput()
            .getOutputFiles()
            .filter(f => /\.js$/.test(f.compilerObject.name))[0]
            .getFilePath()
        });
        console.log(converted);
      }
    });
  } else {
    console.error("No symbol for file?", file.getBaseName());
  }
});
const out = Object.entries(convertedFiles).map(([file, decs]) =>
  decs
    ? `module ${sanitizeReasonModuleName(file)} {
${decs
  .map(
    c => `[@bs.module "${c.modulePath}"]
${c.annotations.map(a => `[${a}]`).join("\n")}
external ${sanitizeReasonVariableName(c.valueName)}: ${c.typeString} = "${
      c.externalName
    }";

`
  )
  .join("\n")}
}`
    : ""
);

fs.writeFileSync(
  output,
  `
module TSExports = {
${dependencies
  .map(d =>
    d.type === "Complex"
      ? `
${d.annotations.map(a => `[${a}]`).join("\n")}
type ${d.identifier} = ${d.definition};
  `
      : ``
  )
  .join("\n")}
${out.map(s => `  ${s}`).join("\n")}
}
`
);
 */

import { config } from "dotenv";
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  ClassDeclaration,
  EnumDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  MethodDeclaration,
  Project,
  PropertySignature,
  Symbol,
  Type,
  TypeAliasDeclaration,
  VariableDeclaration,
  NameableNode,
  NamedNodeBase,
} from "ts-morph";
import yargs from "yargs";
import { Renderer } from "./Renderer";
import { TSUtils } from "./TSUtils";
import { REModels } from "./REModels";
import { Converters } from "./Converter";

const logger = console;

config();

const { output, projectPath } = yargs
  .options({
    output: {
      demandOption: true,
      type: "string",
    },
    projectPath: {
      alias: ["project"],
      description: "Path to a project directory that contains a tsconfig.json",
      demandOption: true,
      type: "string",
    },
  })
  .env().argv;

const logDeclaration = (
  node: {
    getKindName(): string;
    getName(): string | undefined;
    getType(): Type;
  },
  indent: number = 0
) => {
  logger.info(
    Array.from(Array(indent)).join(" "),
    node.getKindName(),
    node.getName(),
    node.getType().getText()
  );
};

const log = (symbol: Symbol, indent = 0) => {
  const declarationNode = symbol.getDeclarations()[0];
  if (!declarationNode) {
    throw new Error("Symbol has no declaration: " + symbol.getName());
  }
  if (declarationNode instanceof TypeAliasDeclaration) {
    logDeclaration(declarationNode, indent);
  } else if (declarationNode instanceof InterfaceDeclaration) {
    logDeclaration(declarationNode, indent);

    declarationNode
      .getType()
      .getProperties()
      .forEach((dec) => log(dec, indent + 4));
  } else if (declarationNode instanceof VariableDeclaration) {
    logDeclaration(declarationNode, indent);
  } else if (declarationNode instanceof ClassDeclaration) {
    logDeclaration(declarationNode, indent);
    declarationNode
      .getType()
      .getProperties()
      .forEach((dec) => log(dec, indent + 4));
  } else if (declarationNode instanceof FunctionDeclaration) {
    logDeclaration(declarationNode, indent);
  } else if (declarationNode instanceof EnumDeclaration) {
    logDeclaration(declarationNode, indent);
  } else if (declarationNode instanceof PropertySignature) {
    logDeclaration(declarationNode, indent);
  } else if (declarationNode instanceof MethodDeclaration) {
    logDeclaration(declarationNode, indent);
  } else if ("getName" in declarationNode) {
    logDeclaration(declarationNode, indent);
  }
};

const run = () => {
  const project = new Project({
    tsConfigFilePath: resolve(process.cwd(), projectPath),
  });

  const program = project.getProgram();
  const checker = program.getTypeChecker();
  const diagnostics = program
    .getGlobalDiagnostics()
    .concat(program.getSyntacticDiagnostics())
    .concat(program.getDeclarationDiagnostics())
    .concat(program.getSemanticDiagnostics());

  if (diagnostics.length) {
    logger.error(TSUtils.printErrors(diagnostics));
    throw new Error(
      "Could not run because there were TypeScript compiler errors"
    );
  }
  project.getSourceFiles().forEach((file) => {
    logger.info(`Running on file ${file.getBaseName()}\n_______`);
    const fileSymbol = file.getSymbol();
    if (fileSymbol) {
      console.log(file.getStructure());
      const exports = checker.getExportsOfModule(fileSymbol);
      const test = Renderer.renderModule(
        exports.reduce(
          (module, next) => {
            const symbol = next.getAliasedSymbol() || next;
            const declarationNode = symbol.getDeclarations()[0];

            return {
              ...module,
              types: [
                ...module.types,
                declarationNode instanceof FunctionDeclaration
                  ? Converters.convertFunction({
                      isConstructor: !!declarationNode
                        .getType()
                        .getConstructSignatures().length,
                      name: declarationNode.getName() || symbol.getName(),
                      signature: declarationNode
                        .getType()
                        .getCallSignatures()[0],
                    })
                  : undefined,
              ].flatMap((i) => (i ? [i] : [])),
            };
          },
          {
            name: "Test",
            vals: [],
            types: [],
          } as REModels.Module
        )
      );
      console.log(test);
      /* exports.forEach(e => {
        log(e.getAliasedSymbol() || e);
      }); */
    }
  });
};

run();

const testRenderer = () => {
  writeFileSync(
    output,
    Renderer.renderModule({
      name: "test",
      vals: [
        {
          jsModulePath: "build/test.js",
          annotations: ["@bs.new"],
          jsName: "TestClass",
          reasonName: "testClassConstructor",
          type: "testClassConstructor",
        },
      ],
      types: [
        {
          annotations: [],
          parameterSymbols: [
            {
              symbolName: "test",
              type: { type: "string" },
            },
          ],
          returnType: {
            type: "string" as const,
          },
          type: "function" as const,
          symbolName: "testClassConstructor",
        },
        {
          type: "record",
          annotations: [],
          symbolName: "test",
          properties: [
            {
              symbolName: "test",
              type: {
                type: "string",
              },
            },
          ],
        },
      ],
    })
  );
};
