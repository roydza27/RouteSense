import React, { useState } from 'react';
import { Activity, Server, ChevronDown, Check, Globe, Trash2, Plus } from 'lucide-react'; 
import { AddServiceModal } from './AddServiceModel'; // <--- Import it

interface DashboardHeaderProps {
  apiBase: string;
  selectedService: string | null;
  setSelectedService: (service: string | null) => void;
  isConnected: boolean;
  collectorLatency: number | null;
  services: string[];
  onClear: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  apiBase,
  selectedService,
  setSelectedService,
  isConnected,
  collectorLatency,
  services,
  onClear
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // <--- New State

  const handleSelect = (value: string | null) => {
    setSelectedService(value);
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* The Modal Component */}
      <AddServiceModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        apiBase={apiBase}
      />

      <div className="container mx-auto px-4 md:px-6 mt-6">
        <div className="relative overflow-visible rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-xl">
          
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none rounded-2xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 p-6">

            {/* LEFT: Identity */}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl border border-white/5 ${isConnected ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                <Globe className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground/80">
                    Metrics Target
                  </p>
                  <span className={`flex h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  {apiBase.replace("http://", "")}
                </h2>
                
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Monitoring
                  <span className="text-foreground font-medium border-b border-primary/20 border-dashed">
                    {selectedService ?? "All Services"}
                  </span>
                </p>
              </div>
            </div>

            {/* RIGHT: Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">

              {/* Status Pill */}
              <div className="flex items-center justify-between sm:justify-start gap-4 rounded-xl border border-white/5 bg-muted/30 px-4 py-2.5 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className={`relative flex h-3 w-3 items-center justify-center`}>
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  </div>
                  <span className={`text-sm font-medium ${isConnected ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isConnected ? "System Healthy" : "Disconnected"}
                  </span>
                </div>

                {collectorLatency !== null && (
                  <>
                    <div className="h-4 w-px bg-white/10 mx-1" />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Activity className="w-3.5 h-3.5" />
                      <span>{collectorLatency}ms</span>
                    </div>
                  </>
                )}
              </div>

              {/* Controls Group */}
              <div className="flex items-center gap-2">
                
                  {/* ADD SERVICE BUTTON (New) */}
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    title="Add new service"
                    className="h-11 w-11 flex items-center justify-center rounded-xl border border-white/10 bg-primary/10 hover:bg-primary/20 hover:border-primary/30 text-primary transition-all shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  {/* CLEAR DATA BUTTON */}
                  {selectedService && (
                    <button
                      onClick={onClear}
                      title="Clear history for this service"
                      className="h-11 w-11 flex items-center justify-center rounded-xl border border-white/10 bg-background/80 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Dropdown */}
                  <div className="relative min-w-[240px]">
                  <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`
                      w-full flex items-center justify-between
                      h-11 rounded-xl border border-white/10
                      bg-background/80 hover:bg-muted/50
                      px-4 text-sm font-medium shadow-sm transition-all
                      hover:border-primary/30 focus:ring-2 focus:ring-primary/20 outline-none
                      ${isDropdownOpen ? 'ring-2 ring-primary/20 border-primary/40' : ''}
                      `}
                  >
                      <div className="flex items-center gap-2 text-foreground">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedService ?? "All Services"}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                      <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-full min-w-[240px] z-20 origin-top-right rounded-xl border border-white/10 bg-card shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Select Source
                          </div>
                          
                          <button
                          onClick={() => handleSelect(null)}
                          className={`
                              w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                              ${!selectedService ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}
                          `}
                          >
                          <span>All Services</span>
                          {selectedService === null && <Check className="w-4 h-4" />}
                          </button>

                          <div className="h-px bg-white/5 my-1" />

                          {services.filter(Boolean).map((s) => (
                          <button
                              key={s}
                              onClick={() => handleSelect(s)}
                              className={`
                              w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                              ${selectedService === s ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}
                              `}
                          >
                              <span className="truncate">{s}</span>
                              {selectedService === s && <Check className="w-4 h-4" />}
                          </button>
                          ))}
                      </div>
                      </>
                  )}
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};