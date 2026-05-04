import { getMniLeads } from "../../../../redux/actions/mrpAction.js";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import "./mrpInsights.css";

export default function MNILeadsInsights() {

  const dispatch = useDispatch();

  const {
    mniLeads = [],
    mniLoading,
    mniError
  } = useSelector(state => state.mrp || {});

  console.log("mniLeads", mniLeads);


  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("authUser");

      if (!storedUser) return;

      const authUser = JSON.parse(storedUser);

      const location = (
        authUser?.businessLocation ||
        localStorage.getItem("selectedLocation") ||
        "trichy"
      ).toLowerCase();

      if (!location) {
        console.warn("Location not found");
        return;
      }

      dispatch(getMniLeads({ location, group: "mni" }));

    } catch (err) {
      console.error("Invalid authUser data", err);
    }
  }, [dispatch]);

  if (mniLoading) return <div>Loading leads...</div>;

  if (mniError) return <div>Error: {mniError}</div>;

  return (
    <div>
      <h3>MNI Leads</h3>

      {mniLeads.length === 0 ? (
        <p>No leads found</p>
      ) : (
        <ul>
          {mniLeads.map((lead, index) => (
            <li key={lead?._id || index}>
              {lead?.businessName || "No Name"} - {lead?.location || "No Location"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}