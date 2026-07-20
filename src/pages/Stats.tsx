import PageHeader from "@/components/layout/PageHeader";
import ConsistencyCards from "@/components/stats/ConsistencyCards";
import WorkoutsChart from "@/components/stats/WorkoutsChart";
import PRSection from "@/components/stats/PRSection";
import VolumeChart from "@/components/stats/VolumeChart";

const Stats = () => {
  return (
    <div className="pb-20 space-y-4">
      <PageHeader title="Estatísticas" />
      <ConsistencyCards />
      <WorkoutsChart />
      <PRSection />
      <VolumeChart />
    </div>
  );
};

export default Stats;
