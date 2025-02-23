const GameConfig = {
    // Level size thresholds for zoom
    levelSizeThreshold: {
        width: 15,
        height: 15
    },
    // Zoom settings
    zoom: {
        normal: 1,
        large: 0.5,  // Zoomed out for large levels
        follow: 2    // Zoomed in when following player
    },
    // Camera settings
    camera: {
        followSpeed: 0.1,
        followThreshold: 32 // Distance before camera starts moving
    }
};
