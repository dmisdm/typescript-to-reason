export module Utils {
  const paddingForAmount = (amount: number) => {
    let out = "";
    for (let i = 0; i < amount; i++) {
      out += " ";
    }
    return out;
  };
  export const leftPadEachLine = (str: string, amount = 2) =>
    str
      .split("\n")
      .map(line => `${paddingForAmount(amount)}${line}`)
      .join("\n");
}
