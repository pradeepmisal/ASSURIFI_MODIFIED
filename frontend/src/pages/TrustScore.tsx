
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import PageTransition from "@/components/PageTransition";
import TrustScoreGauge from "@/components/TrustScoreGauge";

const TrustScore = () => {
  useEffect(() => {
    document.title = "Trust Score - AssureFi Guardian";
  }, []);

  const [score, setScore] = useState(82);

  return (
    <PageTransition>
      <DashboardLayout 
        title="Trust Score" 
        description="Evaluate DeFi projects based on security and transparency metrics"
      >
        <div className="grid gap-6 md:gap-8 lg:grid-cols-5">
          {/* Gauge Panel */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-300" />
                <h2 className="text-xl font-semibold text-white">Trust Score Gauge</h2>
              </div>
              <p className="text-gray-300 text-sm mb-6">Overall confidence for the selected project or address.</p>
              <div className="flex items-center justify-center">
                <TrustScoreGauge score={score} size={240} strokeWidth={16} />
              </div>
              <div className="mt-6">
                <label className="text-gray-300 text-sm">Adjust score (demo)</label>
                <input 
                  type="range" 
                  min={0} 
                  max={100} 
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full accent-blue-400 mt-2"
                />
                <div className="text-gray-400 text-xs mt-1">Drag to preview color and progress animation.</div>
              </div>
            </div>
          </div>

          {/* Explanation Panel */}
          <div className="lg:col-span-3">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">How we derive the Trust Score</h3>
              <p className="text-gray-300 text-sm mb-4">
                The Trust Score is a composite rating that reflects smart contract security, liquidity health, on-chain activity,
                and market behavior. It is designed to provide a quick, intuitive signal while allowing deeper drill-down when needed.
              </p>
              <ul className="grid md:grid-cols-2 gap-3 text-sm">
                <li className="text-gray-200"><span className="text-gray-400">•</span> Smart contract vulnerabilities and risk indicators</li>
                <li className="text-gray-200"><span className="text-gray-400">•</span> Liquidity depth and volatility patterns</li>
                <li className="text-gray-200"><span className="text-gray-400">•</span> Transaction activity, holder distribution</li>
                <li className="text-gray-200"><span className="text-gray-400">•</span> Sentiment and abnormal market behavior</li>
              </ul>
              <div className="mt-6 text-xs text-gray-400">
                Note: This gauge provides a visual summary. Always review the full analysis before making decisions.
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
};

export default TrustScore;
