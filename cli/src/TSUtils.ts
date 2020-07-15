import { Diagnostic } from "ts-morph";

export module TSUtils {
  export const printErrors = (diagnostics: Diagnostic[]) => {
    return diagnostics
      .map(d => {
        const sourceFile = d.getSourceFile();
        return `Error: ${
          sourceFile ? sourceFile.getFilePath() + ":" : ""
        }${d.getLineNumber()}
   ${d.getMessageText()}
`;
      })
      .join("\n");
  };
}
