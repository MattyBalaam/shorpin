import React, { Component, StrictMode } from "react";

import uuidMini from "../utils/uuid-mini";
import Undo from "./Undo";
import Items, { ItemProps } from "./Items";
import getList from "../utils/getList";
import setList from "../utils/setList";

import "../App.css";
import styles from "../App.module.css";

const POLLING = 10000; //10 seconds

type Items = ItemProps[];

interface State {
  items: Items;
  newItem: string;
  itemsAdded: Items;
  itemsRemoved: Items;
  undos: Items[] | [];
}

const getLastItem = (undos: Items[], items: Items): string | null => {
  if (!undos[0]) return null;

  if (!items[0] && undos[0][0]) return undos[0][0].name;

  const lastRemoved = undos[0].find(
    ({ id }) => !items.find(item => item.id === id)
  );

  return lastRemoved ? lastRemoved.name : null;
};

const getInitialState = () => {
  return {
    newItem: "",
    items: [],
    itemsAdded: [],
    itemsRemoved: [],
    undos: []
  };
};

const saveItems = async (stateString: string) => {
  await setList(stateString);
};

class App extends Component<{}, State> {
  state = getInitialState();
  wait: number | undefined;

  componentDidMount = async () => {
    try {
      const items = (await getList()) || [];

      this.setState({ items });
    } catch (err) {
      console.log(err);
    }
  };

  componentWillUnmount() {
    window.clearInterval(this.polling);
  }

  consolidateFromServer = async () => {
    const items = (await getList()) || [];

    const getItemsAdded = (newA: Items, oldA: Items) =>
      newA.filter(({ id }) => !oldA.find(item => item.id === id));

    const getItemsRemoved = (newA: Items, oldA: Items) =>
      oldA.filter(({ id }) => !newA.find(item => item.id === id));

    const { items: previousItems } = this.state;

    const itemsAdded = getItemsAdded(items, previousItems);
    const itemsRemoved = getItemsRemoved(items, previousItems);

    if (!(itemsAdded || itemsRemoved)) return;

    this.setState({ items, itemsAdded, itemsRemoved }, this.waitToCloseFlash);
  };

  waitToCloseFlash() {
    window.clearTimeout(this.wait);
    this.wait = window.setTimeout(
      () => this.setState({ itemsAdded: [], itemsRemoved: [] }),
      5000
    );
  }

  polling = window.setInterval(this.consolidateFromServer, POLLING);

  doAState = (func: (state: State) => any) => {
    //any could be tighter
    this.setState(func, () => {
      saveItems(JSON.stringify(this.state.items));
    });
  };

  handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.keyCode !== 13) return;

    this.doAState(({ items, newItem }) => ({
      items: [...items, { id: uuidMini(), name: newItem }],
      newItem: "",
      undos: []
    }));
  };

  handleChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    this.setState({
      newItem: e.currentTarget.value
    });
  };

  handleFocus = () => {
    this.consolidateFromServer();
  };

  handleRemove = (idToRemove: string) => {
    this.doAState(({ items, undos }) => ({
      items: items.filter(({ id }) => id !== idToRemove),
      undos: [items, ...undos.slice(0, 7)]
    }));
  };

  handleUndo = () => {
    this.doAState(({ undos }) => {
      if (undos.length === 0) return null;
      return {
        items: undos[0],
        undos: undos.slice(1, 9)
      };
    });
  };

  render() {
    const { items, newItem, itemsAdded, itemsRemoved, undos } = this.state;

    return (
      <StrictMode>
        <div className="App">
          <header className={styles.toolBar}>
            <h1 className={styles.title}>Shorpin’</h1>{" "}
            <input
              className={styles.addItem}
              placeholder="add new item"
              type="text"
              value={newItem}
              onFocus={this.handleFocus}
              onChange={this.handleChange}
              onKeyDown={this.handleKeyDown}
            />
          </header>
          {itemsAdded.length > 0 && (
            <div className={styles.itemAdded}>
              <p>New:</p>
              <ul className={styles.refreshItems}>
                {itemsAdded.map(itemList)}{" "}
              </ul>
            </div>
          )}
          {itemsRemoved.length > 0 && (
            <div className={styles.itemRemoved}>
              <p>Removed:</p>
              <ul className={styles.refreshItems}>
                {itemsRemoved.map(itemList)}
              </ul>
            </div>
          )}
          <Items items={items} onRemove={this.handleRemove} />
          <Undo undo={getLastItem(undos, items)} onUndo={this.handleUndo} />
        </div>
      </StrictMode>
    );
  }
}

const itemList = ({ name, id }: ItemProps) => <li key={id}>{name}</li>;
export default App;
