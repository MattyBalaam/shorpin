import React, { Component, StrictMode } from "react";

import uuidMini from "../utils/uuid-mini";
import Undo from "./Undo";
import Items, { ItemProps } from "./Items";
import getList from "../utils/getList";
import setList from "../utils/setList";

import "../App.css";
import styles from "../App.module.css";

interface State {
  items: ItemProps[];
  newItem: string;
  undos: ItemProps[][] | [];
}

const getLastItem = (
  undos: ItemProps[][],
  items: ItemProps[]
): string | null => {
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
    undos: []
  };
};

const saveState = async (stateString: string) => {
  await setList(stateString);
};

class App extends Component<{}, State> {
  state = getInitialState();

  componentDidMount = async () => {
    try {
      const stored = await getList();
      this.setState(stored);
    } catch (err) {
      console.log(err);
    }
  };

  doAState = (func: (state: State) => any) => {
    //any could be tighter
    this.setState(func, () => {
      saveState(JSON.stringify(this.state));
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
    const { items, newItem, undos } = this.state;

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
              onChange={this.handleChange}
              onKeyDown={this.handleKeyDown}
            />
          </header>
          <Items items={items} onRemove={this.handleRemove} />
          <Undo undo={getLastItem(undos, items)} onUndo={this.handleUndo} />
        </div>
      </StrictMode>
    );
  }
}

export default App;
