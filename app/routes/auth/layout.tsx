import { Outlet } from "react-router";
import * as styles from "./layout.css";

export default function AuthLayout() {
  return (
    <div className={styles.layout}>
      <Outlet />
    </div>
  );
}
