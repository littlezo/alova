import { getAlovaInstance } from '#/utils';
import { globalConfig } from '@/index';
import VueHook from '@/predefine/VueHook';
import { matchSnapshotMethod, saveMethodSnapshot } from '@/storage/methodSnapShots';
import { key } from '@/utils/helper';
import { falseValue } from '@/utils/variables';

describe('matchSnapshotMethod', function () {
  test('should change snapshot limitation when set `limitSnapshots` in globalConfig', () => {
    globalConfig({
      limitSnapshots: 0
    });

    const alova = getAlovaInstance(VueHook, {
      responseExpect: r => r.json()
    });
    const Get1 = alova.Get('/unit-test', {
      params: { a: 1 },
      name: 'limitation-method-test'
    });
    const Get2 = alova.Get('/unit-test', {
      params: { a: 2 },
      name: 'limitation-method-test'
    });
    saveMethodSnapshot(alova.id, key(Get1), Get1);
    saveMethodSnapshot(alova.id, key(Get2), Get2);

    // 由于限制为了0个，不能匹配到
    let matchedMethods = matchSnapshotMethod('limitation-method-test');
    expect(matchedMethods).toHaveLength(0);

    globalConfig({
      limitSnapshots: 1
    });
    saveMethodSnapshot(alova.id, key(Get1), Get1);
    saveMethodSnapshot(alova.id, key(Get2), Get2);
    matchedMethods = matchSnapshotMethod('limitation-method-test');
    // 由于限制为了1个，只能匹配到1个
    expect(matchedMethods).toHaveLength(1);

    // 恢复限制
    globalConfig({
      limitSnapshots: 1000
    });
  });

  test('match with name string', () => {
    const alova = getAlovaInstance(VueHook, {
      responseExpect: r => r.json()
    });
    const Get1 = alova.Get('/unit-test', {
      params: { a: 1 },
      name: 'get-method'
    });
    const Get2 = alova.Get('/unit-test', {
      params: { a: 2 },
      name: 'get-method'
    });
    const Get3 = alova.Get('/unit-test', {
      params: { a: 3 },
      name: 'get-method2'
    });

    saveMethodSnapshot(alova.id, key(Get1), Get1);
    saveMethodSnapshot(alova.id, key(Get2), Get2);
    saveMethodSnapshot(alova.id, key(Get3), Get3);

    // 匹配到前两个
    let matchedMethods = matchSnapshotMethod('get-method');
    expect(matchedMethods).toHaveLength(2);
    expect(matchedMethods[0]).toBe(Get1);
    expect(matchedMethods[1]).toBe(Get2);

    // 匹配到两个，并筛选出最后一个
    matchedMethods = matchSnapshotMethod({
      name: 'get-method',
      filter: (_, index, methods) => {
        return index === methods.length - 1;
      }
    });
    expect(matchedMethods).toHaveLength(1);
    expect(matchedMethods[0]).toBe(Get2);

    // 匹配不到
    matchedMethods = matchSnapshotMethod('get-method555');
    expect(matchedMethods).toHaveLength(0);

    // 匹配到两个，但默认取第一个
    let matchedMethod = matchSnapshotMethod('get-method', falseValue);
    expect(matchedMethod).toBe(Get1);

    // 匹配到两个，并筛选出最后一个
    matchedMethod = matchSnapshotMethod(
      {
        name: 'get-method',
        filter: (_, index, methods) => {
          return index === methods.length - 1;
        }
      },
      false
    );
    expect(matchedMethod).toBe(Get2);

    // 匹配不到
    matchedMethod = matchSnapshotMethod('get-method555', falseValue);
    expect(matchedMethod).toBeUndefined();
    // 匹配不到，filter不会被调用
    const mockFn = jest.fn();
    matchedMethod = matchSnapshotMethod(
      {
        name: 'get-method555',
        filter: () => {
          mockFn();
          return true;
        }
      },
      falseValue
    );
    expect(matchedMethod).toBeUndefined();
    expect(mockFn).not.toHaveBeenCalled();
  });

  test('match with name regexp', () => {
    const alova = getAlovaInstance(VueHook, {
      responseExpect: r => r.json()
    });
    const Get1 = alova.Get('/unit-test', {
      params: { a: 1 },
      name: 'get-method1'
    });
    const Get2 = alova.Get('/unit-test', {
      params: { a: 2 },
      name: 'get-method1'
    });
    const Get3 = alova.Get('/unit-test', {
      params: { a: 3 },
      name: 'get-method2'
    });

    saveMethodSnapshot(alova.id, key(Get1), Get1);
    saveMethodSnapshot(alova.id, key(Get2), Get2);
    saveMethodSnapshot(alova.id, key(Get3), Get3);

    // 匹配到包括上个用例，全部6个
    let matchedMethods = matchSnapshotMethod(/^get-method/);
    expect(matchedMethods).toHaveLength(6);

    // 限制只查询当前alova实例的
    matchedMethods = matchSnapshotMethod({
      name: /^get-method/,
      alova
    });
    expect(matchedMethods).toHaveLength(3);
    expect(matchedMethods[0]).toBe(Get1);
    expect(matchedMethods[1]).toBe(Get2);
    expect(matchedMethods[2]).toBe(Get3);

    // 匹配到两个，并筛选出最后一个
    matchedMethods = matchSnapshotMethod({
      name: /get-method1/,
      alova,
      filter: (_, index, methods) => {
        return index === methods.length - 1;
      }
    });
    expect(matchedMethods).toHaveLength(1);
    expect(matchedMethods[0]).toBe(Get2);

    // 匹配不到
    matchedMethods = matchSnapshotMethod(/get-method555/);
    expect(matchedMethods).toHaveLength(0);

    // 匹配到三个，但默认取第一个
    let matchedMethod = matchSnapshotMethod(
      {
        name: /get-method/,
        alova
      },
      falseValue
    );
    expect(matchedMethod).toBe(Get1);

    // 匹配到两个，并筛选出最后一个
    matchedMethod = matchSnapshotMethod(
      {
        name: /get-method1/,
        alova,
        filter: (_, index, methods) => {
          return index === methods.length - 1;
        }
      },
      false
    );
    expect(matchedMethod).toBe(Get2);

    // 匹配不到
    matchedMethod = matchSnapshotMethod(/get-method555/, falseValue);
    expect(matchedMethod).toBeUndefined();
    // 匹配不到，filter不会被调用
    const mockFn = jest.fn();
    matchedMethod = matchSnapshotMethod(
      {
        name: /get-method555/,
        filter: () => {
          mockFn();
          return true;
        }
      },
      falseValue
    );
    expect(matchedMethod).toBeUndefined();
    expect(mockFn).not.toHaveBeenCalled();
  });
});
