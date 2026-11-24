import { springs } from "../../../system/v2/springs";
import { Showcase } from "./showcase";

export default function Foundation() {
  return (
    <main className="rlv2-foundation" data-p602a-isolated="foundation">
      <p className="rlv2-kicker">Design checkpoint · Local fixture</p>
      <h1>P6-02a isolated foundation</h1>
      <p>Shared primitives showcase · No real media or backend.</p>
      <Showcase />
      <section className="rlv2-specimen" aria-labelledby="spring-roles">
        <h2 id="spring-roles">Named spring roles</h2>
        <ul>{Object.entries(springs).map(([name, config]) => (
          <li key={name}>{name}: {config.tension} / {config.friction} / {config.mass}</li>
        ))}</ul>
      </section>
    </main>
  );
}
