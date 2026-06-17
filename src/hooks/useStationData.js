import { useQuery } from '@tanstack/react-query';
import { getStations } from '../lib/sheets';

const useStationData = () => {
  const query = useQuery({
    queryFn: getStations,
    queryKey: ['stations'],
    refetchInterval: 30000,
  });

  return {
    isError: query.isError,
    isLoading: query.isLoading,
    stations: query.data ?? [],
  };
};

export default useStationData;