const anggaranModel = require('../models/anggaranModel');
const { insertLog } = require('../models/logModel');

const createData = async (req, res) => {
    try {
        const result = await anggaranModel.createAnggaran(req.body);
        const username = req.user ? req.user.username : 'System';
        const kode = req.body.kode ? ` (${req.body.kode})` : '';
        const uraian = req.body.uraian || req.body.nama || '';
        await insertLog(username, 'TAMBAH', 'Realisasi DIPA', `Menambahkan kode/program${kode}: ${uraian}`);

        res.status(201).json({ status: "success", message: "Kode/Program berhasil ditambahkan!", dataId: result.insertId });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const getData = async (req, res) => {
    try {
        const data = await anggaranModel.getAllAnggaran();
        res.status(200).json({ status: "success", data: data });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const updateData = async (req, res) => {
    try {
        const id = req.params.id;
        await anggaranModel.updateAnggaran(id, req.body);

        const username = req.user ? req.user.username : 'System';
        const kode = req.body.kode ? ` (${req.body.kode})` : '';
        const uraian = req.body.uraian || req.body.nama || '';
        await insertLog(username, 'EDIT', 'Realisasi DIPA', `Mengubah data anggaran ID ${id}${kode}: ${uraian}`);

        res.status(200).json({ status: "success", message: "Kode/Program berhasil diperbarui!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const deleteData = async (req, res) => {
    try {
        const id = req.params.id;
        await anggaranModel.deleteAnggaran(id);

        const username = req.user ? req.user.username : 'System';
        await insertLog(username, 'HAPUS', 'Realisasi DIPA', `Menghapus data anggaran ID ${id}`);

        res.status(200).json({ status: "success", message: "Kode/Program berhasil dihapus!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const getKRO = async (req, res) => {
    try {
        const data = await anggaranModel.getKRO();
        res.status(200).json({ status: "success", data: data });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const getRO = async (req, res) => {
    try {
        const parentId = req.query.parentId; 
        const data = await anggaranModel.getByParentId(parentId);
        res.status(200).json({ status: "success", data: data });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const getAkun = async (req, res) => {
    try {
        const parentId = req.query.parentId;
        const data = await anggaranModel.getDescendantsByLevel(parentId, 'Akun'); 
        res.status(200).json({ status: "success", data: data });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

const getKegiatan = async (req, res) => {
    try {
        const parentId = req.query.parentId;
        const data = await anggaranModel.getDescendantsByLevel(parentId, 'Detail'); 
        res.status(200).json({ status: "success", data: data });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

module.exports = { 
    createData, getData, updateData, deleteData, 
    getKRO, getRO, getAkun, getKegiatan 
};