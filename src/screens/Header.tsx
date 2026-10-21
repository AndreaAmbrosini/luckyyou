import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.logo}>LuckyYou</span>
    </header>
  );
}
