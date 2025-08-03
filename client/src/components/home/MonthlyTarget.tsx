import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import Badge from "../ui/badge/Badge";

export default function MonthlyTarget() {
  // State for cycling target
  const [target, setTarget] = useState(500);
  const [isOpen, setIsOpen] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState(target.toString());

  // Example: current cycled km this month (replace with real data as needed)
  const currentKm = 320;
  // Calculate completion percentage
  const completionPercentage = Math.min((currentKm / target) * 100, 100);
  
  // Milestones: 1/4, 1/2, 3/4, full of target
  const milestones = [
    { value: Math.round(target * 0.25), label: "25%" },
    { value: Math.round(target * 0.5), label: "50%" },
    { value: Math.round(target * 0.75), label: "75%" },
    { value: target, label: "100%" },
  ];

  const series = [completionPercentage];
  const options: ApexOptions = {
    colors: ["#3B82F6"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: "100%",
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: "70%",
        },
        track: {
          background: "#F1F5F9",
          strokeWidth: "100%",
          margin: 8,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "28px",
            fontWeight: "700",
            offsetY: -10,
            color: "#1E293B",
            formatter: function () {
              return Math.round(currentKm) + " km";
            },
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "horizontal",
        shadeIntensity: 0.25,
        gradientToColors: ["#60A5FA"],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Progress"],
  };

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleModalOpen() {
    setShowInput(true);
    setIsOpen(false);
    setInputValue(target.toString());
  }

  function handleInputBoxClose() {
    setShowInput(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value.replace(/[^0-9]/g, ""));
  }

  function handleInputBoxSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newTarget = parseInt(inputValue, 10);
    if (!isNaN(newTarget) && newTarget > 0) {
      setTarget(newTarget);
      setShowInput(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-gradient-to-br from-white to-gray-50/50 dark:border-gray-800/60 dark:from-gray-900/50 dark:to-gray-900/20 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Monthly Target
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cycling Progress
              </p>
            </div>
          </div>
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
          {/* Progress Chart */}
          <div className="flex-shrink-0 w-full max-w-[280px] lg:max-w-[320px]">
            <div className="relative">
              <Chart
                options={options}
                series={series}
                type="radialBar"
                height={280}
              />
              {/* Progress percentage overlay */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(completionPercentage)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  of {target} km
                </div>
              </div>
            </div>
            
            {/* Target Input Section Below Chart */}
            <div className="mt-4 p-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              {!showInput ? (
                <button
                  onClick={handleModalOpen}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-700 dark:text-blue-300 font-medium hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/30 dark:hover:to-blue-700/30 transition-all duration-200 border border-blue-200 dark:border-blue-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  Change Target
                </button>
              ) : (
                <form onSubmit={handleInputBoxSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Target (km)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={inputValue}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-200"
                      placeholder="Enter target"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleInputBoxClose}
                      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Milestones Section */}
          <div className="flex-1 w-full">
            <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  Milestones
                </h4>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {milestones.filter(m => currentKm >= m.value).length} of {milestones.length} completed
                </div>
              </div>
              
              {/* Responsive milestone grid */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                {milestones.map((milestone, index) => {
                  const isCompleted = currentKm >= milestone.value;
                  const isActive = !isCompleted && (index === 0 || currentKm >= milestones[index - 1].value);
                  
                  return (
                    <div
                      key={milestone.value}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                        isCompleted
                          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                          : isActive
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                          : "bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isActive
                            ? "bg-blue-500 text-white"
                            : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        }`}>
                          {isCompleted ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <div className={`font-medium ${
                            isCompleted || isActive
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {milestone.value} km
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {milestone.label} target
                          </div>
                        </div>
                      </div>
                      
                      {isCompleted && (
                        <Badge color="success" variant="solid" className="text-xs">
                          Done
                        </Badge>
                      )}
                      {isActive && (
                        <Badge color="info" variant="light" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.max(0, target - currentKm)} km
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}