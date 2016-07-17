'use strict';

import "material-design-lite/material.js";

const upgradeAllRegistered = componentHandler.upgradeAllRegistered;
componentHandler.upgradeAllRegistered = function() {};

export const init = () => {
    upgradeAllRegistered();
    componentHandler.upgradeAllRegistered = upgradeAllRegistered;
};