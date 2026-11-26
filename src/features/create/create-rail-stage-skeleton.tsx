import styles from "./create-rail-stage-skeleton.module.css";
function Placeholder({width,height,radius}:{width?:number|string;height:number;radius:number}) {
  return <span aria-hidden="true" className={styles.placeholder} style={{width,height,borderRadius:radius}} />;
}
export function CreateStageSkeleton() {
  return <div role="status" aria-label="Loading your session" className={styles.center}>
    <div className={styles.media} aria-hidden="true" />
    <div className={styles.actions} aria-hidden="true">{[104,140,132,44,44].map((width,i)=><Placeholder key={i} width={width} height={44} radius={22}/>)}</div>
    <div className={styles.card} aria-hidden="true"><Placeholder width={150} height={12} radius={6}/><Placeholder height={15} radius={7}/><Placeholder width="75%" height={15} radius={7}/></div>
    <div className={styles.dots} aria-hidden="true">{[18,6,6].map((width,i)=><Placeholder key={i} width={width} height={6} radius={3}/>)}</div>
  </div>;
}
export function CreateRailSkeleton() {
  return <div className={styles.rail} role="status" aria-label="Loading Create">
    <Placeholder width={110} height={16} radius={8}/>
    <div className={styles.rows}>{[0,1,2].map(i=><div className={styles.row} key={i}><Placeholder width={56} height={56} radius={14}/><div><Placeholder height={13} radius={7}/><Placeholder width="60%" height={11} radius={6}/></div></div>)}</div>
    <div className={styles.search}><Placeholder width={130} height={16} radius={8}/><Placeholder height={42} radius={21}/><div><Placeholder height={14} radius={7}/><Placeholder width="80%" height={14} radius={7}/></div><div><Placeholder height={14} radius={7}/><Placeholder width="70%" height={14} radius={7}/></div></div>
  </div>;
}
