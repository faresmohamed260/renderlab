import { AccountSettings } from "@/features/account/account-settings";
import styles from "@/features/account/account-settings.module.css";

const date = "2026-11-25T00:00:00.000Z";
const id = "synthetic-component-fixture";

// Review only: real component with typed synthetic signed-in account data.
// The production Settings page, auth gate and /settings fixture remain unchanged.
export default function ReviewSettings() {
  return <section className={styles.workspace}>
    <header className={styles.intro}>
      <p className={styles.eyebrow}>Account security</p>
      <h1 className={styles.title}>Settings</h1>
      <p className={styles.lede}>Manage your account, access and security.</p>
    </header>
    <AccountSettings configured identity={{id,email:"review@example.invalid"}}
      access={{userId:id,role:"admin",status:"active",generationEnabled:null,maxActiveJobs:null,maxJobsPerHour:null,createdAt:date,updatedAt:date}}
      enforcementEnabled showAdminLink mfaState="verified"
      sessions={[{id:"synthetic-session",isCurrent:true,createdAt:date,lastActiveAt:date,clientLabel:"Review browser"}]}
      profile={{displayName:"Synthetic Member",avatarState:"none",avatarUpdatedAt:null,avatarUrl:null}} />
  </section>;
}
