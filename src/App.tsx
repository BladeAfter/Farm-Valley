import { t } from "./i18n/core";
import { useEffect } from "react";
import { Leaf } from "lucide-react";
import { useLocale } from "./i18n/core";
import { useState } from "react";
import { World } from "./components/World";
import { Hud } from "./components/hud/Hud";
import { FarmControls } from "./components/hud/FarmControls";
import { FarmPanels } from "./components/modals/FarmPanels";
import { PlotPopover } from "./components/modals/PlotPopover";
import { useFarm } from "./store/useFarm";
import { PlacementBar } from "./components/obstacles/PlacementBar";
export function App() {
  useLocale((state) => state.revision);
  const { load, messageCode, messageParams, messageVersion, busy, snapshot } = useFarm();
  const message=t(messageCode,messageParams);
  const [noticeVisible, setNoticeVisible] = useState(true);
  useEffect(() => {
    setNoticeVisible(true);
    const timer = window.setTimeout(() => setNoticeVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [messageVersion]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main>
      <World />
      <div className="world-vignette" />
      <Hud />
      <FarmControls />
      <PlotPopover />
      <FarmPanels />
      <PlacementBar />
      <div role="status" className="toast" data-visible={noticeVisible || busy}>
        {busy ? t("common.busy") : message}
      </div>
      <div className="build-status">
        <i className={snapshot ? "connected" : ""} />
        {snapshot
          ? snapshot.storage === "file"
            ? t("common.synced")
            : snapshot.persistent
              ? t("common.synced")
              : t("common.temporary")
          : t("notifications.loading")}
      </div>
      {!snapshot && (
        <div className="loading-overlay">
          <Leaf size={42} />
          <h2>{t("tutorial.opening")}</h2>
          <p>{message}</p>
          <button onClick={() => void load()}>{t("common.retry")}</button>
        </div>
      )}
      <div className="rotate">
        <Leaf size={48} />
        <h2>{t("tutorial.rotateTitle")}</h2>
        <p>{t("tutorial.rotate")}</p>
      </div>
    </main>
  );
}
