import React, { Component, StrictMode } from "react";
import { Transition } from "react-spring";
import uuidMini from "../utils/uuid-mini";
import Animator from "./Animator";
import "../App.css";
import styles from "../App.module.css";

interface Item {
  id: string;
  name: string;
}

interface State {
  items: Item[];
  newItem: string;
  undos: Item[][] | [];
}

const getLastItem = (undos: Item[][], items: Item[]) => {
  if (!items[0] && undos[0][0]) return undos[0][0].name;

  if (!undos[0]) return null;

  const lastRemoved = undos[0].find(
    ({ id }) => !items.find(item => item.id === id)
  );

  return lastRemoved && lastRemoved.name;
};

const getInitialState = () => {
  const stored = window.localStorage.getItem("shorpin");
  if (stored) {
    return JSON.parse(stored) as State;
  }

  return {
    newItem: "",
    items: [],
    undos: []
  };
};

const saveState = (stateString: string) => {
  window.localStorage.setItem("shorpin", stateString);
};

class App extends Component<{}, State> {
  state = getInitialState();

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
          <article className={styles.listContainer}>
            <ul className={styles.items}>
              <Animator
                items={items}
                itemRender={({ props, item, state }) => (
                  <li className={styles.item} style={props} key={item.id}>
                    <button
                      className={styles.button}
                      type="button"
                      onClick={() => this.handleRemove(item.id)}
                    >
                      <span>{item.name}</span>
                      <span className={`${styles.tick} ${state}`}>✔</span>
                    </button>
                  </li>
                )}
              />
            </ul>
          </article>

          <Transition
            items={undos.length > 0}
            from={{ opacity: 0, transform: "translateY(5em)" }}
            enter={{ opacity: 1, transform: "translateY(0em)" }}
            leave={{ opacity: 0, transform: "translateY(5em)" }}
          >
            {show =>
              show &&
              (props => (
                <aside className={`${styles.undo}`} style={props}>
                  <button
                    className={styles.undoButton}
                    onClick={this.handleUndo}
                  >
                    Undo for: {getLastItem(undos, items)}
                  </button>
                </aside>
              ))
            }
          </Transition>
        </div>
      </StrictMode>
    );
  }
}

export default App;
