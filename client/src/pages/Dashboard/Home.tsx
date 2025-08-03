import LiveBikeStats from "../../components/home/FourCards";
import MonthlyTarget from "../../components/home/MonthlyTarget";

import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Smart Bike Dashboard"
        description="Real-time bike data monitoring dashboard with live speed, distance, and location tracking"
      />
      <PageBreadcrumb pageTitle="" />
      
      <div className="space-y-6">
        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12">
            <LiveBikeStats />
          </div>

          <div className="col-span-12">
            <MonthlyTarget />
          </div>

          
        </div>
      </div>
    </>
  );
}
