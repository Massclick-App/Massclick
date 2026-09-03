import { BadgeCheck, Ban, BriefcaseBusiness, Building2, Eye, MapPin, Network, RefreshCw, Tags, Target, TrendingUp, UserRoundCheck, Users } from "lucide-react";
import styles from "features/public/mrp/components/groupCreationContent.module.css";

const Flow = ({ name, group }) => <div className={styles.flow}><b>{name}</b><span><MapPin />Trichy</span><i>+</i><span><Tags />Restaurant</span><em>→</em><strong>{group}</strong></div>;

export default function GroupCreationContent({ groupName = "A", paidBusinesses = 13 }) {
  const benefits = [
    [Eye,"Higher Business Visibility","A focused position inside a relevant local business network."],
    [Users,"Better Referral Opportunities","Group members can identify and refer customers when your service is relevant."],
    [Ban,"Less Direct Competition","Only one business from the same category is placed in each group."],
    [MapPin,"Local Business Focus","Location-based organization makes networking and referrals locally relevant."],
    [TrendingUp,"Higher Growth Opportunity","Exclusive category positioning, local networking, and referrals work together."]
  ];
  return <div className={styles.content}>
    <section className={styles.intro}><div><span>How group creation works</span><h3>Automatic, fair, and built to scale</h3><p>MassClick supports <b>1,000+ business categories</b> across different locations. After a paid subscription is completed, the system creates or assigns an MNI group using <b>Location + Category</b>.</p></div><div className={styles.rule}><BriefcaseBusiness /><b>Paid Business</b><i>→</i><b>Location + Category</b><i>→</i><strong>Automatic Group Assignment</strong></div></section>

    <section className={styles.block}><header><b>01</b><div><span>Registration</span><h3>Choose Your Business</h3></div></header><p>Every subscribed business is registered using two essential matching signals:</p><div className={styles.signalGrid}><div><MapPin /><span>Location</span><b>Trichy</b></div><div><Tags /><span>Business category</span><b>Restaurant</b></div></div><div className={styles.formula}><span>Example</span><b>Trichy</b><i>+</i><b>Restaurant</b></div></section>

    <section className={styles.block}><header><b>02</b><div><span>Matching engine</span><h3>Automatic Group Matching</h3></div></header><p>MassClick checks whether the same location and category combination already has a position in a group. Each new same-category business receives the next available group.</p><div className={styles.flows}><Flow name="Restaurant 1" group="Group A"/><Flow name="Restaurant 2" group="Group B"/><Flow name="Restaurant 3" group="Group C"/></div></section>

    <section className={styles.block}><header><b>03</b><div><span>Category exclusivity</span><h3>One Business per Category in a Group</h3></div></header><p>Each group maintains category uniqueness, creating focused communities without duplicate category competitors.</p><div className={styles.compare}><div className={styles.wrong}><span><Ban />Not in one group</span><p>Restaurant 1</p><p>Restaurant 2</p></div><div className={styles.right}><span><BadgeCheck />Correct assignment</span><p>Restaurant 1 <b>Group A</b></p><p>Restaurant 2 <b>Group B</b></p></div></div></section>

    <section className={styles.block}><header><b>04</b><div><span>Dynamic scaling</span><h3>Groups Grow Automatically</h3></div></header><p>There is <b>no fixed number of groups</b> and <b>no fixed number of businesses</b>. Groups continue to expand and organize automatically as paid businesses join.</p><div className={styles.dynamic}><div><RefreshCw /><b>1,000+</b><span>Available categories</span></div><div><Building2 /><b>{paidBusinesses}</b><span>Current paid businesses</span></div><div><Network /><b>Dynamic</b><span>Group creation</span></div></div><div className={styles.categoryExample}><span>Example assignments</span><div><b>Restaurant</b><em>Group A</em><b>Salon</b><em>Group B</em><b>Hospital</b><em>Group C</em><b>Furniture</b><em>Group D</em><b>Hotel</b><em>Group E</em></div></div></section>

    <section className={styles.block}><header><b>05</b><div><span>Business advantages</span><h3>Why This Model Benefits Your Business</h3></div></header><div className={styles.community}><div><MapPin />Trichy + Restaurant</div><h4>Group {groupName}</h4><div>{["Restaurant 1","Salon","Furniture","Hotel","Hospital","Digital Marketing"].map((name,index)=><span className={index===0?styles.featured:""} key={name}>{index===0?<UserRoundCheck/>:<BriefcaseBusiness/>}{name}</span>)}</div><p>Restaurant 1 holds the unique restaurant position. When Restaurant 2 joins, it receives Group B with other complementary businesses.</p></div><div className={styles.benefits}>{benefits.map(([Icon,title,text])=><article key={title}><Icon/><div><b>{title}</b><p>{text}</p></div></article>)}</div></section>

    <section className={styles.finalRule}><Target/><div><span>Simple concept</span><h3>1 Location + 1 Group + 1 Business per Category</h3><p>More focused business opportunities. As MassClick grows, every eligible paid business can secure its own category position within a relevant local network.</p></div></section>
  </div>;
}
