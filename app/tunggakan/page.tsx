"use client"

import { useTunggakan } from "@/hooks/useTunggakan";
import { TunggakanHeader } from "@/components/tunggakan/TunggakanHeader";
import { TunggakanToolbar } from "@/components/tunggakan/TunggakanToolbar";
import { TunggakanTable } from "@/components/tunggakan/TunggakanTable";

export default function TunggakanPage() {
  const {
    mounted,
    searchTerm, setSearchTerm,
    filterBulan, setFilterBulan,
    filterTahun, setFilterTahun,
    isLoading, loadData,
    processedData,
    availableYears
  } = useTunggakan();

  // Mencegah Hydration Mismatch pada Next.js
  if (!mounted) return null;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-500 text-black font-sans">
      
      <TunggakanHeader 
        filterBulan={filterBulan} 
        filterTahun={filterTahun} 
        totalMasuk={processedData.totalMasuk} 
        totalTunggakan={processedData.totalTunggakan} 
      />

      <TunggakanToolbar 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        filterBulan={filterBulan} 
        setFilterBulan={setFilterBulan} 
        filterTahun={filterTahun} 
        setFilterTahun={setFilterTahun} 
        onRefresh={loadData} 
        availableYears={availableYears}
      />

      <TunggakanTable 
        isLoading={isLoading} 
        data={processedData.list} 
        filterBulan={filterBulan} 
      />
      
    </div>
  );
}