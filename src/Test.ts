/* export class TestNoConstructor {
  public testProperty: number = 5;
  public tester() {}
  public tester2: () => { test: string } = () => ({ test: "hoy" });
  public static testStatic = "hoy";
}

export class TestConstructor {
  constructor(test: string) {}
  public testProperty: number = 5;
  public tester() {}
  public tester2 = () => null;
  public static testStatic = "hoy";
}

export type TestComponentProps = { test: string };
export const TestComponent = function(props: TestComponentProps) {
  return {
    component: "string5"
  };
};
 */
export type Test = {
  test: string;
};

export class TestClass {
  yoyo = () => "heyhey";
}

export type TT = string;

export interface TestInterface {
  wadup: "yo";
  shiznit: 3000;
  t: TestClass;
}

export function FN<T>(props: T) {
  return {
    hoy: "test"
  };
}

export type test<T> = {};

export const t = {};

export const ttt = ArrayBuffer;
