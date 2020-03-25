import { default as DS } from 'data-store';
import path from 'path';

export class Store {
  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }

    return Store.instance;
  }

  public static get(key: string, mustExist: boolean = true): any {
    const value: any = Store.getInstance().getItem(key);
    if (mustExist && !value) {
      throw new Error(`${key} is undefined.`);
    }
    return value;
  }

  public static set(key: string, value: any): any {
    return Store.getInstance().setItem(key, value);
  }

  // tslint:disable-next-line: readonly-keyword
  private static instance: Store;
  // tslint:disable-next-line: readonly-keyword
  private static store: DS;
  private readonly dataFilePath = path.join(__dirname, '../../../data.json');

  private constructor() {
    Store.store = new DS({ path: this.dataFilePath });
  }

  private getItem(key: string): any {
    const item = Store.store.get(key);
    return item;
  }

  private setItem(key: string, value: any): void {
    Store.store.set(key, value);
  }
}
