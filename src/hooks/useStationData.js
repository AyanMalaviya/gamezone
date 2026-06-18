import { useQuery } from '@tanstack/react-query';
import { getStations } from '../lib/sheets';

const useStationData = () => {
  const query = useQuery({
    queryFn: getStations,
    queryKey: ['stations'],
    refetchInterval: 30_000,
  });

  return {
    isError:   query.isError,
    isLoading: query.isLoading,
    refetch:   query.refetch,
    stations:  query.data ?? [],
  };
};

export default useStationData;
