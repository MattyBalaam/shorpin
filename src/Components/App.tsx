import React, { Component, StrictMode } from "react";

import uuidMini from "../utils/uuid-mini";
import Undo from "./Undo";
import Items, { ItemProps } from "./Items";
import InfoModal from "./InfoModal";
import getList from "../utils/getList";
import setList from "../utils/setList";

import "../App.css";
import styles from "../App.module.css";

const POLLING = 10000; //10 seconds
const RETRY = 5000; //5 seconds

enum Error {
  LOADING = "loading errror",
  SAVING = "saving error"
}

enum Info {
  SUCCESS = "saved"
}

type Items = ItemProps[];

interface State {
  info?: string;
  infoType?: Error | Info;
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
    info: undefined,
    infoType: undefined,
    items: [],
    itemsAdded: [],
    itemsRemoved: [],
    undos: []
  };
};

const saveItems = async (stateString: string) => {
  try {
    const { success } = await setList(stateString);
    if (!success) {
      window.setTimeout(() => saveItems(stateString), RETRY);
      return Error.SAVING;
    }
    return Info.SUCCESS;
  } catch (err) {
    return err.toString();
  }
};

class App extends Component<{}, State> {
  state = getInitialState();
  polling: number | undefined;
  wait: number | undefined;

  componentDidMount = async () => {
    try {
      const items = (await getList()) || [];

      this.setState({ items });
    } catch (err) {
      this.setState({ info: err.toString(), infoType: Error.LOADING });
    }
    this.addListeners();
  };

  componentWillUnmount() {
    window.clearInterval(this.polling);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
  }

  setUpPolling() {
    this.polling = window.setInterval(this.consolidateFromServer, POLLING);
  }

  addListeners() {
    this.setUpPolling();
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  visibilityHandler = () => {
    window.clearInterval(this.polling);

    if (document.visibilityState === "visible") {
      this.consolidateFromServer();
      this.setUpPolling();
    }
  };

  consolidateFromServer = async () => {
    try {
      const items = (await getList()) || [];

      const getItemsAdded = (newA: Items, oldA: Items) =>
        newA.filter(({ id }) => !oldA.find(item => item.id === id));

      const getItemsRemoved = (newA: Items, oldA: Items) =>
        oldA.filter(({ id }) => !newA.find(item => item.id === id));

      const { items: previousItems } = this.state;

      const itemsAdded = getItemsAdded(items, previousItems);
      const itemsRemoved = getItemsRemoved(items, previousItems);

      if (!(itemsAdded || itemsRemoved)) return;

      this.setState(
        {
          items,
          itemsAdded,
          itemsRemoved,
          info: undefined,
          infoType: undefined
        },
        this.waitToCloseFlash
      );
    } catch (err) {
      this.setState({ info: err.toString(), infoType: Error.LOADING });
    }
  };

  waitToCloseFlash() {
    window.clearTimeout(this.wait);
    this.wait = window.setTimeout(
      () => this.setState({ itemsAdded: [], itemsRemoved: [] }),
      5000
    );
  }

  doAState = (func: (state: State) => any) => {
    //any could be tighter
    this.setState(func, this.doASave);
  };

  doASave = async () => {
    try {
      this.setState({ info: "Saving" });
      const save = await saveItems(JSON.stringify(this.state.items));
      if (save === Info.SUCCESS) {
        window.setTimeout(() => {
          this.setState({ info: undefined });
        }, 500); // TODO);
      } else {
        this.setState({ info: save, infoType: Error.SAVING });
        window.setTimeout(this.doASave, RETRY);
      }
    } catch (err) {
      this.setState({ info: err.toString(), infoType: Error.SAVING });
    }
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
    const {
      info,
      infoType,
      items,
      newItem,
      itemsAdded,
      itemsRemoved,
      undos
    } = this.state;

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
          {info && <InfoModal message={info} type={infoType} />}
          <Items items={items} onRemove={this.handleRemove} />
          <Undo undo={getLastItem(undos, items)} onUndo={this.handleUndo} />
        </div>
      </StrictMode>
    );
  }
}

const itemList = ({ name, id }: ItemProps) => <li key={id}>{name}</li>;
export default App;
