import { Type, SourceFile } from "ts-morph";
export const convertObject = (sourceFile: SourceFile, type: Type) => {
  if (!type.isObject()) {
    return {
      error: {
        message: `${type.getText()} is not an object`
      }
    };
  }

  /* 
    - If no properties, return unit or Js_obj.empty()?
    - Convert each property and return structure
  */
};
