ig.baked = !0;
ig.module("completion-remaining-info-gui").requires("game.feature.gui.screen.title-screen", "game.feature.gui.screen.pause-screen", "game.feature.menu.gui.base-menu", "game.feature.menu.menu-model", "impact.base.lang", "impact.feature.gui.gui", "game.feature.interact.button-group", "game.feature.menu.gui.menu-misc", "game.feature.gui.base.text", "impact.feature.interact.press-repeater", "game.feature.menu.gui.tab-box").defines(() => {
	// START: Lang Extension
	// If this code is changed into a real mod/extension this can be moved into a separate lang JSON.
	const LANG_EXTENSION = {
		"sc": {
			"completionhelper": {
				"title": "Completion Helper",
				"name": {
					"botanics": "Botanics",
					"combat": "Combat",
					"enemies": "Enemies",
					"traders": "Traders",
				}
			}
		}
	};
	ig.Lang.inject({
		onload(...args) {
			this.parent(...args);
			function setProperties(from, to) {
				for (const [key, value] of Object.entries(from)) {
					if (typeof value === "object") {
						setProperties(value, to[key] = to[key] || {});
					} else {
						to[key] = value;
					}
				}
			}
			setProperties(LANG_EXTENSION, this.labels);
		},
	});
	// END: Lang Extension
	const COMPLETION_HELPER = {
		AREAS: 0,
		BOTANICS: 1,
		CHESTS: 2,
		CONSUMABLES: 3,
		ENCYCLOPEDIA: 4,
		ENEMIES: 5,
		EQUIPMENT: 6,
		LANDMARK: 7,
		QUESTS: 8,
		TRADERS: 9,
	};
	const ICON_MAP = {
		areas: "lore-earth-lore",
		botanics: "area-heat-area",
		chests: "",
		consumables: "",
		encyclopedia: "",
		enemies: "stats-combat",
		equipment: "",
		landmark: "",
		quests: "quest",
		traders: "lore-people",
	};
	const BotanicsInfoBox = ig.BoxGui.extend({
		ninepatch: new ig.NinePatch("media/gui/menu.png", {
			width: 2,
			height: 8,
			left: 27,
			top: 21,
			right: 27,
			bottom: 3,
			offsets: {
				"default": {
					x: 456,
					y: 244
				},
				focus: {
					x: 576,
					y: 432
				},
			}
		}),
		gfx: new ig.Image("media/gui/menu.png"),
		icon: null,
		plant: null,
		plantView: null,
		plantName: null,
		location: null,
		locationIcon: null,
		init() {
			this.parent(431, 46);
			this.setSize(431, 46);
			this.icon = new sc.TextGui("");
			this.icon.setPos(7, 2);
			this.addChildGui(this.icon);
			this.plantView = new sc.BotanicsPlantView;
			this.plantView.setAlign(ig.GUI_ALIGN.X_RIGHT, ig.GUI_ALIGN.Y_TOP);
			this.plantView.setPos(1, 1);
			this.addChildGui(this.plantView);
			this.plantName = new sc.TextGui("");
			this.plantName.setPos(37, 1);
			this.addChildGui(this.plantName);
			this.locationIcon = new ig.ImageGui(this.gfx, 481, 224, 8, 11);
			this.locationIcon.setPos(38, 20);
			this.addChildGui(this.locationIcon);
			this.location = new sc.TextGui("", {
					font: sc.fontsystem.smallFont,
					linePadding: -1,
					maxWidth: 184
				});
			this.location.setPos(51, 19);
			this.addChildGui(this.location);
		},
		setPlant(id) {
			this.plant = id;
			let fabricated = false
			if (id && !sc.menu.dropCounts[id]) {
				// Ideally we'd use sc.ItemDestructDisplayGui directly but this hacky workaround is just easier.
				fabricated = true
				sc.menu.dropCounts[id] = {
					anim: ig.globalSettings.getGlobalSettingOptions("ENTITY", "ItemDestruct")[id].desType
				}
			}
			this.plantView.setPlant(id);
			if (fabricated) {
				sc.menu.dropCounts[id] = undefined
			}
			const dropData = sc.menu.drops[id];
			this.icon.setText(dropData ? "\\i[area-" + (dropData.area || "other") + "]" : "");
			this.plantName.setText(dropData && ig.LangLabel.getText(dropData.name));
			this.location.setText(dropData && ig.LangLabel.getText(dropData.subArea));
			this.locationIcon.hook.localAlpha = dropData ? 1 : 0;
		},
		show() {
			this.doStateTransition("DEFAULT");
		},
		hide() {
			this.doStateTransition("HIDDEN");
		},
	});
	function getEnemyCategory(enemy) {
		return sc.EnemyListBox.prototype.getEnemyCategoryKey(enemy.category) + (enemy.boss ? "-boss" : "");
	}
	const CompletionHelperListBox = sc.ListTabbedPane.extend({
		gfx: new ig.Image("media/gui/menu.png"),
		submitSound: null,
		errorSound: null,
		init() {
			this.parent(true);
			this.setSize(264, 262);
			this.setAlign(ig.GUI_ALIGN.X_RIGHT, ig.GUI_ALIGN.Y_TOP);
			this.setPivot(264, 262);
			this.setPanelSize(264, 243);
			this.submitSound = sc.BUTTON_SOUND.submit;
			this.errorSound = sc.BUTTON_SOUND.denied;
			this.hook.transitions = {
				DEFAULT: {
					state: {},
					time: 0.2,
					timeFunction: KEY_SPLINES.LINEAR
				},
				HIDDEN: {
					state: {
						alpha: 0,
						offsetX: -132
					},
					time: 0.2,
					timeFunction: KEY_SPLINES.LINEAR
				},
				HIDDEN_EASE: {
					state: {
						alpha: 0,
						offsetX: -132
					},
					time: 0.2,
					timeFunction: KEY_SPLINES.EASE
				}
			};
			this.addTab("enemies", 0, {
				type: COMPLETION_HELPER.ENEMIES,
			});
			this.addTab("quests", 1, {
				type: COMPLETION_HELPER.QUESTS,
			});
			this.addTab("botanics", 2, {
				type: COMPLETION_HELPER.BOTANICS,
			});
			this.addTab("areas", 3, {
				type: COMPLETION_HELPER.AREAS,
			});
		},
		addObservers() {
			sc.Model.addObserver(sc.menu, this);
		},
		removeObservers() {
			sc.Model.removeObserver(sc.menu, this);
		},
		show() {
			this.parent();
			this.setTab(this.currentTabIndex || 0, true, {
				skipSounds: true
			});
			ig.interact.setBlockDelay(0.2);
			this.doStateTransition("DEFAULT");
		},
		hide() {
			this.parent();
			this.doStateTransition("HIDDEN");
		},
		onListEntryPressed() {},
		onLeftRightPress(a, b, c) {
			this.submitSound.play();
			sc.menu.switchSynopsisPage(c == 1 ? 1 : -1);
			return {
				skipSounds: true
			};
		},
		onTabChanged(a) {
			sc.menu.setSynoTab();
			(ig.input.mouseGuiActive || this.currentGroup.isEmpty()) && sc.menu.setSynopInfo(null, true);
		},
		onTabButtonCreation(a, b, c) {
			a = new sc.ItemTabbedBox.TabButton("", ICON_MAP[a], 28);
			a.textChild.setPos(7, 1);
			a.setPos(0, 2);
			a.setData({
				type: c.type
			});
			this.addChildGui(a);
			return a;
		},
		onTabPressed(a, b) {
			if (!b) {
				this.submitSound.play();
				this.setTab(this.getButtonIndex(a));
				for (var c = this.tabArray.length; c--; )
					if (a == this.tabArray[c]) {
						sc.menu.setSynoTab(c);
						break
					}
				sc.menu.setSynopInfo(null, true);
				sc.menu.setQuestInfo(null, true);
				return false;
			}
		},
		onTabSelected() {
			ig.input.mouseGuiActive && (sc.menu.setSynopInfo(null, true) || sc.menu.setQuestInfo(null, true));
		},
		onTabMouseFocusLost() {
			sc.menu.setSynopInfo(null, true);
			sc.menu.setQuestInfo(null, true);
		},
		onCreateListEntries(list, group, type, sort) {
			list.clear();
			group.clear();
			switch (type) {
				case COMPLETION_HELPER.ENEMIES: {
					for (const [id, enemy] of Object.entries(ig.database.get("enemies"))) {
						if (!enemy.track || sc.stats.getMap("combat", "kill" + id)) {
							continue;
						}
						const isAreaBoosted = sc.map.getAreaItemToggleState(sc.AREA_ITEM_TYPE.BOOSTER, enemy.area);
						const level = isAreaBoosted && sc.combat.canShowBoostedEntry(id, enemy.boss) ? enemy.boostedLevel || sc.MIN_BOOSTER_LEVEL : enemy.level;
						const icon = "\\i[enemy-" + getEnemyCategory(enemy) + "]";
						const enemyEntry = new sc.EnemyEntryButton(icon + sc.combat.getEnemyName(id), id, level || 1);
						list.addButton(enemyEntry);
					}
					break;
				}
				case COMPLETION_HELPER.QUESTS: {
					for (const [id, quest] of Object.entries(sc.quests.staticQuests)) {
						if (quest.noTrack || quest.parentQuest || sc.quests.finishedQuests[id] || sc.quests.activeQuests.some((questWrapper) => questWrapper.quest === quest)) {
							continue;
						}
						const icon = quest.elite ? "\\i[quest-elite]" : "\\i[quest]";
						const questEntry = new sc.ItemBoxButton(icon + quest.name, 236, 25, quest.level);
						questEntry.setData({
							quest: Object.assign({}, quest, {location: {area: sc.map.getAreaName(quest.area), map: quest.person.value}}),
						});
						list.addButton(questEntry);
					}
					break;
				}
				case COMPLETION_HELPER.BOTANICS: {
					for (const [id, drop] of Object.entries(sc.menu.drops)) {
						if (!drop.track || (sc.menu.dropCounts[id] && sc.menu.dropCounts[id].completed)) {
							continue;
						}
						const entry = new sc.ItemBoxButton("\\i[area-" + (drop.area || "other") + "]" + ig.LangLabel.getText(drop.name), 264, 0);
						entry.data = {
							id,
							drop,
						};
						list.addButton(entry);
					}
					break;
				}
				case COMPLETION_HELPER.AREAS: {
					for (const [id, area] of Object.entries(sc.map.areas)) {
						if (!area.track || sc.map.areasVisited[id.toCamel()]) {
							continue;
						}
						list.addButton(new sc.ItemBoxButton(ig.LangLabel.getText(area.name), 264, 0));
						console.log('~~', id, id.toCamel(), area);
					}
					break;
				}
			}
			if (!list.getChildren().length) {
				// Display a 100% completed message.
				const textBox = new sc.TextGui("100% complete");
				textBox.setAlign(ig.GUI_ALIGN.X_CENTER, ig.GUI_ALIGN.Y_CENTER);
				list.addChildGui(textBox);
			}
		},
		onListEntrySelected(listEntry) {
			switch (this.getCurrentType()) {
				case COMPLETION_HELPER.ENEMIES: {
					sc.menu.setSynopInfo(listEntry.key);
					break;
				}
				case COMPLETION_HELPER.QUESTS: {
					sc.menu.setQuestInfo(listEntry.data.quest);
					break;
				}
				case COMPLETION_HELPER.BOTANICS: {
					sc.menu.setSynopInfo(listEntry.data.id, listEntry.data.drop);
					break;
				}
			}
		},
		onListMouseFocusLost() {
			sc.menu.setSynopInfo(null, null);
			sc.menu.setQuestInfo(null, null);
		},
		getCurrentType() {
			return this.getCurrentTabButton().data.type;
		},
		modelChanged() {},
	});
	const CompletionHelperMenu = sc.BaseMenu.extend({
		buttonGroup: null,
		enemyInfo: null,
		contents: null,
		infoBoxes: [],
		list: null,
		questInfo: null,
		init() {
			this.parent();

			this.hook.size.x = ig.system.width;
			this.hook.size.y = ig.system.height;
			this.buttonGroup = new sc.ButtonGroup; // Controls focus of controls and keyboard inputs.
			this.contents = new ig.GuiElementBase;

			this.list = new CompletionHelperListBox;
			this.list.setPos(8, 29);
			this.list.bg.hook.pos.y = this.list.bg.hook.pos.y - 5;
			this.list.bg.hook.size.y = this.list.bg.hook.size.y + 5;
			this.list.doStateTransition("HIDDEN", true);

			this.enemyInfo = new sc.EnemyInfoBox;
			this.questInfo = new sc.QuestInfoBox;
			this.botanicsInfo = new BotanicsInfoBox;
			this.infoBoxes = [this.enemyInfo, this.questInfo, this.botanicsInfo];
			for (const infoBox of this.infoBoxes) {
				infoBox.setSize(281, 265);
				infoBox.setAlign(ig.GUI_ALIGN.X_LEFT, ig.GUI_ALIGN.Y_TOP);
				infoBox.hook.transitions = {
					DEFAULT: {
						state: {},
						time: 0.2,
						timeFunction: KEY_SPLINES.EASE
					},
					HIDDEN: {
						state: {
							alpha: 0,
							offsetX:  - (infoBox.hook.size.x / 2)
						},
						time: 0.2,
						timeFunction: KEY_SPLINES.LINEAR
					}
				};
				infoBox.setPos(8, 29);
				this.addChildGui(infoBox);
				infoBox.doStateTransition("HIDDEN", true);
			}

			this.addChildGui(this.list);
			this.doStateTransition("DEFAULT");
		},
		addObservers() {
			sc.Model.addObserver(sc.menu, this);
		},
		removeObservers() {
			sc.Model.removeObserver(sc.menu, this);
		},
		showMenu() {
			this.addObservers();
			sc.menu.pushBackCallback(this.onBackButtonPress.bind(this)); // Register back button handling.
			sc.menu.moveLeaSprite(0, 0, sc.MENU_LEA_STATE.HIDDEN); // No idea what this is.
			sc.menu.buttonInteract.pushButtonGroup(this.buttonGroup); // Make our button group active.
			ig.interact.setBlockDelay(0.2); // Don't let the user interact while the menu is animating into place.
			this.list.show(); // Animation the list.
			switch (this.list.getCurrentType()) {
        		case COMPLETION_HELPER.ENEMIES: {
					this.enemyInfo.show();
					break;
				}
				case COMPLETION_HELPER.QUESTS: {
					this.questInfo.show();
					break;
				}
				case COMPLETION_HELPER.BOTANICS: {
					this.botanicsInfo.show();
					break;
				}
			}
		},
		hideMenu() {
			this.removeObservers();
			sc.menu.moveLeaSprite(0, 0, sc.MENU_LEA_STATE.LARGE); // No idea what this is.
			this.exitMenu();
		},
		exitMenu() {
			sc.menu.buttonInteract.removeButtonGroup(this.buttonGroup); // Make our button group inactive.
			sc.menu.popBackCallback(); // Unregister the back button handling.
			this.list.hide(); // Animation the list.
			for (const infoBox of this.infoBoxes) {
				infoBox.hide();
			}
		},
		onBackButtonPress() {
			// Pop our menu to go back up to the menu that created ours.
			sc.menu.popMenu();
		},
		modelChanged(dispatcher, event, d) {
			if (dispatcher == sc.menu) {
				switch (event) {
					case sc.MENU_EVENT.SYNO_CHANGED_TAB: {
						for (const infoBox of this.infoBoxes) {
							infoBox.hide();
						}
						switch (this.list.getCurrentType()) {
							case COMPLETION_HELPER.ENEMIES: {
								this.enemyInfo.show();
								break;
							}
							case COMPLETION_HELPER.QUESTS: {
								this.questInfo.show();
								break;
							}
							case COMPLETION_HELPER.BOTANICS: {
								this.botanicsInfo.show();
								break;
							}
						}
						this.list.currentList.activate();
						break;
					}
					case sc.MENU_EVENT.SYNOP_SET_INFO: {
						switch (this.list.getCurrentType()) {
	                		case COMPLETION_HELPER.ENEMIES: {
	                			if (sc.menu.synopInfo) {
			                		this.enemyInfo.setCategory(getEnemyCategory(ig.database.get("enemies")[sc.menu.synopInfo]));
			                		this.enemyInfo.setEnemy(sc.menu.synopInfo);
			                	} else {
			                		this.enemyInfo.setCategory(null);
				                	this.enemyInfo.setEnemy(null);
			            		}
	                			break;
	                		}
	                		case COMPLETION_HELPER.BOTANICS: {
	                			if (sc.menu.synopInfo) {
           							this.botanicsInfo.setPlant(sc.menu.synopInfo);
	                			} else {
	                				this.botanicsInfo.setPlant(null);
	                			}
	                			break;
	                		}
	                	}
	                	break;
                	}
					case sc.MENU_EVENT.QUEST_SET_INFO: {
						this.questInfo.setQuest(sc.menu.questInfo);
						break;
					}
            	}
			}
		},
	});
	// Add cheats as a new submenu item.
	sc.MENU_SUBMENU.COMPLETION_HELPER = Object.keys(sc.MENU_SUBMENU).length;
	// Define the cheats name and what class it instantiates.
	sc.SUB_MENU_INFO[sc.MENU_SUBMENU.COMPLETION_HELPER] = {
		Clazz: CompletionHelperMenu,
		name: "completionhelper",
	};
	sc.MenuModel.inject({
		getMenuAsName(menuId) {
			if (menuId === sc.MENU_SUBMENU.COMPLETION_HELPER) {
				return ig.lang.get("sc.completionhelper.title");
			}
			return this.parent.apply(this, arguments);
		},
	});
	sc.PauseScreenGui.inject({
		completionHelperButton: null,
		init() {
			this.parent();
			// Create our new Cheats menu button.
			this.completionHelperButton = new sc.ButtonGui(ig.lang.get("sc.completionhelper.title"), sc.BUTTON_DEFAULT_WIDTH);
			this.completionHelperButton.setAlign(ig.GUI_ALIGN.X_RIGHT, ig.GUI_ALIGN.Y_BOTTOM);
			this.completionHelperButton.onButtonPress = () => {
				// What menu should be entered when clicked.
				sc.menu.setDirectMode(true, sc.MENU_SUBMENU.COMPLETION_HELPER);
				sc.model.enterMenu(true);
			};
			this.insertChildGui(this.completionHelperButton);
		},
		updateButtons() {
			this.removeChildGui(this.completionHelperButton);
			this.parent();
			this.addChildGui(this.completionHelperButton);

			// Get the first button in the first column so we can position our button above it.
			const firstButtonHook = this.buttonGroup.elements[0][0].hook;
			// Position our new Cheats button above the current ones.
			this.completionHelperButton.setPos(firstButtonHook.pos.x, firstButtonHook.pos.y + firstButtonHook.size.y + 16);
			// Set it to be first in keyboard order, bump the others down.
			this.buttonGroup.insertFocusGui(this.completionHelperButton, 0, 0);
		},
	});
});