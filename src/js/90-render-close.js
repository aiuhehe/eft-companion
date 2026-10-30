      {/* ピン詳細位置画像の拡大表示 */}
      {pinImageViewer && (
        <div className="pin-img-viewer" onClick={() => setPinImageViewer(null)}>
          <div className="pin-img-viewer-name">
            <Icon name="camera" size={13} color="var(--text-secondary)" /> {pinImageViewer.name}
          </div>
          <img src={pinImageViewer.dataUrl} alt={pinImageViewer.name} />
        </div>
      )}
    </div>
  );
}
