import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const ContractorPage = () => {
  const router = useRouter();
  const { contractorId } = router.query;
  const [contractor, setContractor] = useState(null);

  useEffect(() => {
    if (contractorId) {
      const fetchContractor = async () => {
        const res = await fetch(`/api/contractor/${contractorId}`);
        const data = await res.json();
        setContractor(data);
      };
      fetchContractor();
    }
  }, [contractorId]);

  if (!contractor) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{contractor.name}</h1>
      <p>{contractor.description}</p>
    </div>
  );
};

export default ContractorPage;