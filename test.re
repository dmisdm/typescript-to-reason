module Test = {
  type testClassConstructor = (~test: string) => string;
  type test = {test: string};

  type tttt = string;
  [@bs.module "build/test.js"] [@bs.new]
  external testClassConstructor: testClassConstructor = "TestClass";
};